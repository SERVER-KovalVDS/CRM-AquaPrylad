const mysql = require('mysql2/promise');
const config = require('config');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const iconv = require('iconv-lite');
const fs = require('fs');
const path = require('path');

async function getCalendarDates_chernigiv(criteria) {
    try {
        const con = await mysql.createConnection(config.get('MySQL.R145j7_aqua_crm_chernigiv'));
        const sql = `   SELECT DISTINCT CONVERT_TZ(certificate_date, '+00:00', @@session.time_zone) as availableDate 
                        FROM meters 
                        WHERE balanser = ? 
                            AND certificate_date IS NOT NULL
                            AND number IS NOT NULL
                            AND type_id IS NOT NULL
                            AND prod_date IS NOT NULL
                            AND result IS NOT NULL
                            AND address_id IS NOT NULL
                            AND protocol_num IS NOT NULL
                            AND certificate_num IS NOT NULL
                            AND certificate_date IS NOT NULL
                            AND verification_date IS NOT NULL`;
        const [rows] = await con.execute(sql, [criteria]);

        const availableDates = rows.map(row => row.availableDate);

        await con.end();

        return { 
            action: "CalendarDatesResponse",
            calendar_dates: availableDates
        };
    } catch (error) {
        console.error('Error fetching available dates:', error);
        throw error;
    }
}

async function GenerateReportCSV_chernigiv(criteria, ws) {
    try {
        const con = await mysql.createConnection(config.get('MySQL.R145j7_aqua_crm_chernigiv'));
        let sql = '';
        let filterParameters = [];
        
        const [startDate, endDate, balancer] = criteria;

        const startDateISO = new Date(startDate.trim()).toISOString().split('T')[0];
        const endDateISO = new Date(endDate.trim()).toISOString().split('T')[0];

        sql = `SELECT * FROM meters 
               WHERE DATE(CONVERT_TZ(certificate_date, '+00:00', @@session.time_zone)) BETWEEN ? AND ? 
                 AND balanser = ?
                 AND number IS NOT NULL
                 AND type_id IS NOT NULL
                 AND prod_date IS NOT NULL
                 AND result IS NOT NULL
                 AND address_id IS NOT NULL
                 AND protocol_num IS NOT NULL
                 AND certificate_num IS NOT NULL
                 AND certificate_date IS NOT NULL
                 AND verification_date IS NOT NULL`;
        filterParameters.push(startDateISO, endDateISO, balancer);

        const [rows] = await con.execute(sql, filterParameters);

        if (rows.length === 0) {
            await con.end();
            ws.send(JSON.stringify({ action: "reportResponse", status: 'progress', progress: 100 }));
            ws.send(JSON.stringify({ action: "reportResponse", status: 'warning', message: 'Лічильники з датою повірки у обраному діапазоні для обраного постачальника послуг не знайдено.' }));
            return;
        }

        const columns = [
            'ZAJAVKA_FIO', 'TELEFONS', 'TOWN_NAME', 'RAJON_NAME', 'STREET_NAME', 'STREET_TIP_NAME', 'DOM_FULL',
            'KORPUS', 'KV_FULL', 'SERVICE_TYPE', 'COUNTER_NUMBER', 'COUNTER_TYPE_NAME', 'COUNTER_PRODUCTION_YEAR',
            'START_VOLUME', 'SEAL_NUMBER', 'MESTО_PU', 'VALID_STATUS', 'DOCUMENT_ISSUE_DATE', 'DOCUMENT_VALID_DATE',
            'P_ID', 'COUNTER_TYPE_ID', 'MESTО_PU_ID', 'TOWN_ID', 'RAJON_ID', 'STREET_ID', 'STREET_TIP_ID', 'DOM_ID',
            'DOM_BUКВА', 'KV', 'KVB', 'HREF'
        ];

        const data = [];
        const totalRows = rows.length;
        let previousProgress = 0;
        for (let i = 0; i < totalRows; i++) {
            const row = rows[i];
            let street_name = 'NULL';
            let street_id_vdk = 'NULL';
            let dom_full = 'NULL';
            let korpus = 'NULL';
            let kv_full = 'NULL';
            let counter_type_name = 'NULL';

            if (row.address_id) {
                const [addressRows] = await con.execute(`SELECT * FROM addresses WHERE ID = ?`, [row.address_id]);
                if (addressRows.length > 0) {
                    const address = addressRows[0];
                    const street_id = address.adr_street_id;
                    dom_full = address.adr_building || 'NULL';
                    korpus = address.adr_building2 || 'NULL';
                    kv_full = (address.adr_fl_of === 'п/сектор' || !address.adr_fl_of) ? 'NULL' : address.adr_fl_of;

                    if (street_id) {
                        const [streetRows] = await con.execute(`SELECT name_vdk, ID_vdk FROM street_base WHERE ID = ?`, [street_id]);
                        if (streetRows.length > 0) {
                            const street = streetRows[0];
                            street_name = street.name_vdk || 'NULL';
                            street_id_vdk = street.ID_vdk || 'NULL';
                        }
                    }
                }
            }

            if (row.type_id) {
                const [typeRows] = await con.execute(`SELECT type FROM meters_base WHERE ID = ?`, [row.type_id]);
                if (typeRows.length > 0) {
                    counter_type_name = typeRows[0].type || 'NULL';
                }
            }

            const certificate_date = row.certificate_date ? new Date(row.certificate_date).toLocaleDateString('uk-UA') : 'NULL';
            const validity_date = row.validity_date ? new Date(row.validity_date).toLocaleDateString('uk-UA') : 'NULL';
            const location = row.location === 'Ванна' ? 'С/В' : (row.location === 'Кухня' ? 'К' : row.location || 'NULL');
            const start_volume = row.value ? row.value.toString().padStart(5, '0') : 'NULL';

            data.push({
                ZAJAVKA_FIO: 'NULL',
                TELEFONS: row.phone || 'NULL',
                TOWN_NAME: 'Чернігів',
                RAJON_NAME: 'Чернигов',
                STREET_NAME: street_name,
                STREET_TIP_NAME: 'NULL',
                DOM_FULL: dom_full || 'NULL',
                KORПус: korpus || 'NULL',
                KV_FULL: kv_full || 'NULL',
                SERVICE_TYPE: row.service_type || 'NULL',
                COUNTER_NUMBER: row.number || 'NULL',
                COUNTER_TYPE_NAME: counter_type_name,
                COUNTER_PRODUCTION_YEAR: row.prod_date || 'NULL',
                START_VOLUME: start_volume,
                SEAL_NUMBER: 'NULL',
                MESTО_PU: location,
                VALID_STATUS: row.result || 'NULL',
                DOCUMENT_ISSUE_DATE: certificate_date,
                DOCUMENT_VALID_DATE: validity_date,
                P_ID: 'NULL',
                COUNTER_TYPE_ID: 'NULL',
                MESTО_PU_ID: 'NULL',
                TOWN_ID: '6263',
                RAJON_ID: '40416',
                STREET_ID: 'NULL',
                STREET_TIP_ID: street_id_vdk,
                DOM_ID: dom_full || 'NULL',
                DOM_BUКВА: korpus || 'NULL',
                KV: kv_full || 'NULL',
                KVB: 'NULL',
                HREF: 'NULL'
            });
            const progress = Math.round((i + 1) / totalRows * 100);
            if (progress !== previousProgress) {
                ws.send(JSON.stringify({ action: "reportResponse", status: 'progress', progress }));
                previousProgress = progress;
            }
        }

        const startDateFormatted = new Date(filterParameters[0]).toLocaleDateString('uk-UA');
        const endDateFormatted = new Date(filterParameters[1]).toLocaleDateString('uk-UA');
        const currentDateTime = new Date().toLocaleString('uk-UA', { timeZone: 'Europe/Kiev', hour12: false });
        const filename = `report ${balancer} ${startDateFormatted}-${endDateFormatted} at ${currentDateTime}.csv`;
        const filepath = path.resolve(__dirname, '../uploads', filename);

        const csvWriter = createCsvWriter({
            path: filepath,
            header: columns.map(column => ({ id: column, title: column })),
            fieldDelimiter: ';'
        });

        await csvWriter.writeRecords(data);

        const utf8Content = fs.readFileSync(filepath, 'utf8');
        const win1251Content = iconv.encode(utf8Content, 'win1251');
        fs.writeFileSync(filepath, win1251Content);

        await con.end();

        const base64Content = Buffer.from(win1251Content).toString('base64');
        ws.send(JSON.stringify({ action: "reportResponse", status: 'progress', progress: 100 }));
        ws.send(JSON.stringify({
            action: "reportResponse",
            status: 'success',
            message: 'Файл згенеровано успішно.',
            row_count: data.length,
            file_name: filename,
            file_content: base64Content
        }));

        fs.unlink(filepath, (err) => {
            if (err) {
                console.error(`Error deleting file: ${filepath}`, err);
            }
        });

    } catch (error) {
        console.error('Error DataBase request for Genration reports : ', error);
        ws.send(JSON.stringify({ action: "reportResponse", status: 'progress', progress: 100 }));
        ws.send(JSON.stringify({ action: "reportResponse", status: 'error', message: `Помилка формування звіту: ${error.message}` }));
    }
}

module.exports = {  getCalendarDates_chernigiv,
                    GenerateReportCSV_chernigiv,
                    }