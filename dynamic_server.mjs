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
        let p3 = dbSelect('SELECT pl_id FROM Planets WHERE pl_name = ? AND pl_id > ? ORDER BY pl_id ASC', [current, id]);
        let p4 = dbSelect('SELECT pl_id FROM Planets WHERE pl_name = ? AND pl_id < ? ORDER BY pl_id ASC', [current, id]);
        let next, prev;
        Promise.all([p3, p4]).then((ids) => {
            let n_tmp = ids[0][ids[0].length-1];
            let p_tmp = ids[0][0];
            console.log(ids);
            let p5, p6;
            if(n_tmp != undefined) {
                let next_id = n_tmp.pl_id + 1;
                p5 = dbSelect('SELECT pl_name FROM Planets WHERE pl_id = ?', [next_id]);
            } else {
                next = current;
            }
            if(p_tmp != undefined) {
                let prev_id = p_tmp.pl_id - 1;
                p6 = dbSelect('SELECT pl_name FROM Planets WHERE pl_id = ?', [prev_id]);            } else {
                prev = current;
            }
            Promise.all([p5, p6]).then((links) => {
                if(n_tmp != undefined) {
                    try {
                        next = links[0][0].pl_name;
                    } catch {}
                }
                if(p_tmp != undefined) {
                    try {
                        prev = links[0][1].pl_name;
                    } catch {}
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
            });
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
