import * as fs from 'node:fs';
import * as path from 'node:path';
import * as url from 'node:url';

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

app.get('/pl_name/:name', (req, res) => { // Planet Name
    const sql = 'SELECT * FROM Planets ORDER BY pl_id ASC';

    db.all(sql, [], (err, rows) => {
        if (err) {
            throw err;
        }
    });
    let name = decodeURIComponent(req.params.name.toUpperCase());
    let p1 = dbSelect('SELECT * FROM Planets WHERE UPPER(pl_name) = ?', [name]);
    let p2 = fs.promises.readFile(path.join(template, 'temp.html'), 'utf-8');
    Promise.all([p1, p2]).then((results) => {
        let current = results[0][0].pl_name;
        let response = results[1].replace('$$CURRENT$$', current).replace('$$CURRENT$$', current);

        let id = results[0][0].pl_id;
        let p3 = dbSelect('SELECT pl_id FROM Planets WHERE pl_name = ? AND pl_id > ? ORDER BY pl_id ASC LIMIT 3', [current, id]);
        let p4 = dbSelect('SELECT pl_id FROM Planets WHERE pl_name = ? AND pl_id < ? ORDER BY pl_id DESC LIMIT 3', [current, id]);
        let next, prev;
        Promise.all([p3, p4]).then((links) => {
            console.log(links);
            try {
                next = links[0][0].pl_name;
            } catch {
                next = current;
            }
            try {
                prev = links[1][0].pl_name;
            } catch {
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
        res.status(200).type('html').send(response);
        })
    }).catch((error) => {
        res.status(404).type('txt').send('No data found for planet ' + name);
    });
});

app.get('/disc_year/:year', (req, res) => { // Discovery Year
    let year = decodeURIComponent(req.params.year);
    let p1 = dbSelect('SELECT * FROM Planets WHERE disc_year = ?', [year]);
    let p2 = fs.promises.readFile(path.join(template, 'temp.html'), 'utf-8');
    Promise.all([p1, p2]).then((results) => {
        let current = results[0][0].disc_year;
        let response = results[1].replace('$$CURRENT$$', current).replace('$$CURRENT$$', current);

        let next = parseInt(current)+1;
        let prev = parseInt(current)-1;
        if(next == 2024) {
            response = response.replace('$$NEXT$$', '');
        } else {
            response = response.replace('$$NEXT$$', next);
        }
        if(prev == 1993) {
            response = response.replace('$$PREV$$', '');
        } else {
            response = response.replace('$$PREV$$', prev);
        }
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
        res.status(200).type('html').send(response);
    }).catch((error) => {
        res.status(404).type('txt').send('No data found for year ' + year);
    });
});

app.listen(port, () => {
    console.log('Now listening on port ' + port);
});
