import * as fs from 'node:fs';
import * as path from 'node:path';
import * as url from 'node:url';
import Chart from 'chart.js/auto';

import { default as express } from 'express';
import { default as sqlite3 } from 'sqlite3';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const port = 8000;
const root = path.join(__dirname, 'public');
const template = path.join(__dirname, 'templates');

let app = express();
app.use(express.static(root));

const db = new sqlite3.Database(path.join(__dirname, 'exoplanets.sqlite3'), sqlite3.OPEN_READONLY, (err) => {
    if(err) {
        console.log('Error connecting to database');
    } else {
        console.log('Successfully connected to database');
    }
});

function dbSelect(query, params) {
    let p = new Promise((resolve, reject) => {
        db.all(query, params, (err, rows) => {
            if(err) {
                reject(err);
            } else {
                resolve(rows);
            }
        });
    });
    return p;
}

app.get('/:filt/:val', (req, res) => {
    let filter = decodeURIComponent(req.params.filt.toLowerCase());
    let value = decodeURIComponent(req.params.val.toUpperCase());
    if(filter !== 'sy_dist') {
        let p1 = dbSelect('SELECT * FROM Planets WHERE UPPER(' + filter + ') = ?', [value]);
        let p2 = fs.promises.readFile(path.join(template, 'temp.html'), 'utf-8');
        let p3 = dbSelect('SELECT DISTINCT ' + filter + ' FROM Planets ORDER BY ' + filter + ' ASC');
        Promise.all([p1, p2, p3]).then((results) => {
            let current = results[0][0][filter];
            let response = results[1].replace('$$CURRENT$$', current).replace('$$CURRENT$$', current);
            
            let names = results[2].map(row => row[filter]);
            let spot = names.indexOf(current);
            let next, prev;
            if(names[spot+1] != undefined) {
                next = names[spot+1];
            } else {
                next = current;
            }
            if(names[spot-1] != undefined) {
                prev = names[spot-1];
            } else {
                prev = current;
            }
            response = response.replace('$$NEXT$$', next);
            response = response.replace('$$PREV$$', prev);
            let table_body = '';
            results[0].forEach((planet) => {
                let table_row = '<tr>';

                table_row += '<td>' + planet.pl_name + '</td>\n';
                table_row += '<td>' + planet.discoverymethod + '</td>\n';
                table_row += '<td>' + planet.disc_year + '</td>\n';
                table_row += '<td>' + planet.disc_facility + '</td>\n';
                table_row += '<td>' + planet.pl_orbper + '</td>\n';
                table_row += '<td>' + planet.pl_bmasse + '</td>\n';
                table_row += '<td>' + planet.sy_dist + '</td>\n';

                table_row += '</tr>\n';
                table_body += table_row;
            });
            response = response.replace('$$TABLE_BODY$$', table_body);
            response = response.replace('$$IMG$$', filter);
            res.status(200).type('html').send(response);
        }).catch((error) => {
            res.status(404).type('txt').send('No data found for ' + filter + ' ' + value);
        });
    } else {
        let p1 = dbSelect('SELECT * FROM Planets WHERE sy_dist = ?', [value]);
        let p2 = fs.promises.readFile(path.join(root, 'chart.html'), 'utf-8');
        let p3 = dbSelect('SELECT DISTINCT sy_dist FROM Planets ORDER BY sy_dist DESC');
        Promise.all([p1, p2, p3]).then((results) => {
            let cur_planet = results[0][0].pl_name;
            let current = value;
            let response = results[1].replace('$$CURRENT$$', cur_planet);
            
            let dists = results[2].map(row => row.sy_dist);
            let spot = dists.indexOf(value);
            let next, prev;
            if(dists[spot+1] != undefined) {
                next = dists[spot+1];
            } else {
                next = current;
            }
            if(dists[spot-1] != undefined) {
                prev = dists[spot-1];
            } else {
                prev = current;
            }
            response = response.replace('$$NEXT$$', next);
            response = response.replace('$$PREV$$', prev);
            res.status(200).type('html').send(response);
        }).catch((error) => {
            res.status(404).type('txt').send('No data found for distance ' + value);
        });
    }
});

app.listen(port, () => {
    console.log('Now listening on port ' + port);
});
