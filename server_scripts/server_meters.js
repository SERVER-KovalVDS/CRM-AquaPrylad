const mysql = require('mysql2/promise');
const config = require('config');

async function AllMeters() {
    try {
        const conAquaCrm = await mysql.createConnection(config.get('MySQL.R145j7_aqua_crm'));
        const conBases = await mysql.createConnection(config.get('MySQL.R145j7_bases'));
        const [meters] = await conAquaCrm.query('SELECT * FROM meters');

        for (const meter of meters) {
            const [addressData] = await conAquaCrm.query('SELECT * FROM adresses WHERE id = ?', [meter.address_id]);
            if (addressData.length > 0) {
                const [streetData] = await conBases.query('SELECT new_name FROM street_base WHERE ID = ?', [addressData[0].adr_street_id]);
                meter.address = {
                    street: streetData[0].new_name,
                    building: addressData[0].adr_building,
                    building2: addressData[0].adr_building2 || '',
                    flat_or_office: addressData[0].adr_fl_of || ''
                };
            }
            const [typeData] = await conBases.query('SELECT * FROM meters_base WHERE id = ?', [meter.type_id]);
            if (typeData.length > 0) {
                meter.type = {
                    name: typeData[0].name,
                    type: typeData[0].type,
                    dn: typeData[0].dn,
                    temperature: typeData[0].temperature,
                    producer: typeData[0].producer
                };
            }
        }

        await conAquaCrm.end();
        await conBases.end();

        return meters;
    } catch (error) {
        console.error('Error DataBase request: ', error);
        throw error;
    }
}

async function AllMeters_chernigiv(criteria = {}) {
    try {
        const con = await mysql.createConnection(config.get('MySQL.R145j7_aqua_crm_chernigiv'));
        const countQuery = `SELECT COUNT(*) as total FROM meters`;
        const [countResult] = await con.query(countQuery);
        const totalRecords = countResult[0].total;
        let filterCountQuery = `SELECT COUNT(*) as total FROM meters`;
        let filterParameters = [];
        let conditions = [];

        for (let key in criteria) {
            if (criteria[key] === 'dublicates') {
                conditions.push(`${key} IN (SELECT ${key} FROM meters GROUP BY ${key}, type_id HAVING COUNT(*) > 1)`);
            } else if (criteria[key] === null) {
                conditions.push(`${key} IS NULL`);
            } else if (criteria[key]) {
                if (typeof criteria[key] === 'string' && criteria[key].includes('=>')) {
                    const [startDate, endDate] = criteria[key].split('=>').map(date => {
                        const isoDate = new Date(date.trim()).toISOString().split('T')[0];
                        return isoDate;
                    });
                    conditions.push(`${key} BETWEEN ? AND ?`);
                    filterParameters.push(startDate, endDate);
                } else {
                    conditions.push(`${key} = ?`);
                    filterParameters.push(criteria[key]);
                }
            }
        }

        if (conditions.length > 0) {
            filterCountQuery += ` WHERE ${conditions.join(' AND ')}`;
        }

        const [filterCountResult] = await con.query(filterCountQuery, filterParameters);
        const filterRecords = conditions.length > 0 ? filterCountResult[0].total : 'ALL';
        let filterMetersQuery = `SELECT m.ID FROM meters m`;
        if (conditions.length > 0) {
            filterMetersQuery += ` WHERE ${conditions.join(' AND ')}`;
        }

        const [filteredMeters] = await con.query(filterMetersQuery, filterParameters);
        const filteredMeterIds = filteredMeters.map(meter => meter.ID);
        const tasksQuery = `
            SELECT meters_id, tasks_type 
            FROM tasks 
            ORDER BY ID DESC`;
        const [tasks] = await con.query(tasksQuery);

        const meterIds = [];
        const meterTasksMap = {};

        for (const task of tasks) {
            if (task.meters_id) {
                const ids = task.meters_id.split('|').map(id => parseInt(id, 10)).filter(id => filteredMeterIds.includes(id));
                for (const id of ids) {
                    if (!meterIds.includes(id)) {
                        meterIds.push(id);
                        meterTasksMap[id] = task.tasks_type;
                    }
                    if (meterIds.length >= 100) {
                        break;
                    }
                }
            }
            if (meterIds.length >= 100) {
                break;
            }
        }

        // Если счетчиков из заявок меньше 100, дополняем счетчиками с result = 1
        if (meterIds.length < 100) {
            const remainingCount = 100 - meterIds.length;
            const additionalMetersQuery = `
                SELECT ID 
                FROM meters 
                WHERE result = 1 AND ${meterIds.length > 0 ? `ID NOT IN (${meterIds.join(',')}) AND` : ''} ${conditions.length > 0 ? `${conditions.join(' AND ')} AND` : ''} 1=1
                LIMIT ${remainingCount}`;
            const [additionalMeters] = await con.query(additionalMetersQuery, filterParameters);
            meterIds.push(...additionalMeters.map(meter => meter.ID));
        }

        // Если и после этого счетчиков меньше 100, дополняем оставшимися счетчиками
        if (meterIds.length < 100) {
            const remainingCount = 100 - meterIds.length;
            const remainingMetersQuery = `
                SELECT ID 
                FROM meters 
                WHERE ${meterIds.length > 0 ? `ID NOT IN (${meterIds.join(',')}) AND` : ''} ${conditions.length > 0 ? `${conditions.join(' AND ')} AND` : ''} 1=1
                LIMIT ${remainingCount}`;
            const [remainingMeters] = await con.query(remainingMetersQuery, filterParameters);
            meterIds.push(...remainingMeters.map(meter => meter.ID));
        }

        let meters = [];

        if (meterIds.length > 0) {
            let metersQuery = `
                SELECT m.ID, m.number, m.type_id, m.prod_date, m.service_type, m.value, m.location, m.balanser, m.result, m.status, 
                    a.adr_building, a.adr_building2, a.adr_fl_of, CONCAT(sb.type, " ", sb.name) AS street, mb.name AS meter_type_name 
                FROM meters m 
                LEFT JOIN addresses a ON m.address_id = a.ID 
                LEFT JOIN street_base sb ON a.adr_street_id = sb.ID
                LEFT JOIN meters_base mb ON m.type_id = mb.ID
                WHERE m.ID IN (${meterIds.join(',')})`;

            // Если запрос на дубликаты, добавляем сортировку по номеру
            if (criteria.number === 'dublicates' && criteria.type_id === 'dublicates') {
                metersQuery += ` ORDER BY m.number`;
            } else {
                // Оставляем сортировку по ID, если не запрос на дубликаты
                metersQuery += ` ORDER BY FIELD(m.ID, ${meterIds.join(',')})`;
            }
            
            const [queriedMeters] = await con.query(metersQuery);

            // Формируем итоговый массив счетчиков с задачами
            for (const meter of queriedMeters) {
                if (meter.adr_building === null && meter.adr_fl_of === null && meter.street === null) {
                    meter.address = null;
                } else {
                    meter.address = `${meter.street}, буд. ${meter.adr_building}${meter.adr_building2 ? `, корп. ${meter.adr_building2}` : ''}${meter.adr_fl_of ? `, кв. ${meter.adr_fl_of}` : ''}`;
                }
                meter.type_id = meter.meter_type_name;
                meter.tasks = meterTasksMap[meter.ID] || null;
                delete meter.meter_type_name;
                delete meter.adr_building;
                delete meter.adr_building2;
                delete meter.adr_fl_of;
                delete meter.street;
            }

            meters = queriedMeters;
        } else {
            meters = [];
        }

        await con.end();
        return {
            data: meters,
            totalRecords: totalRecords,
            filteredRecords: filterRecords,
            displayedRecords: meters.length
        };
    } catch (error) {
        console.error('Error DataBase request for |AllMeters_chernigiv| : ', error);
        throw error;
    }
}

async function SearchMeters_chernigiv(searchData) {
    try {
        const con = await mysql.createConnection(config.get('MySQL.R145j7_aqua_crm_chernigiv'));
        const query = `
            SELECT ID, number 
            FROM meters 
            WHERE number LIKE ? 
            LIMIT 100`;
        const [meters] = await con.query(query, [`%${searchData}%`]);
        await con.end();
        return meters;
    } catch (error) {
        console.error('Error DataBase request for |SearchMeters_chernigiv| : ', error);
        throw error;
    }
}


async function ObjectMeters_chernigiv(meterId) {
    try {
        const con = await mysql.createConnection(config.get('MySQL.R145j7_aqua_crm_chernigiv'));
        
        const meterQuery = `
            SELECT m.ID, m.number, mb.name AS type_id, m.prod_date, m.service_type, m.value, m.location, m.balanser, m.result, m.status, 
                   m.protocol_num, m.certificate_num, m.history,
                   CONVERT_TZ(m.certificate_date, '+00:00', @@session.time_zone) AS certificate_date, 
                   CONVERT_TZ(m.verification_date, '+00:00', @@session.time_zone) AS verification_date, 
                   CONVERT_TZ(m.validity_date, '+00:00', @@session.time_zone) AS validity_date,
                   a.ID as address_id, a.adr_building, a.adr_building2, a.adr_fl_of, CONCAT(sb.type, " ", sb.name) AS street
            FROM meters m
            LEFT JOIN addresses a ON m.address_id = a.ID
            LEFT JOIN street_base sb ON a.adr_street_id = sb.ID
            LEFT JOIN meters_base mb ON m.type_id = mb.ID
            WHERE m.ID = ?
        `;
        const [meterResult] = await con.query(meterQuery, [meterId]);

        if (meterResult.length === 0) {
            await con.end();
            return null;
        }

        const meter = meterResult[0];

        const taskDetailsQuery = `
            SELECT ID, CONVERT_TZ(date, '+00:00', @@session.time_zone) as date, tasks_type, meters_id
            FROM tasks
        `;
        const [taskDetails] = await con.query(taskDetailsQuery);

        const task = taskDetails.find(task => {
            const meterIds = task.meters_id ? task.meters_id.split('|').map(id => parseInt(id, 10)) : [];
            return meterIds.includes(meterId);
        });

        if (meter.adr_building === null && meter.adr_fl_of === null && meter.street === null) {
            meter.address = null;
        } else {
            meter.address = `${meter.street}, буд. ${meter.adr_building}${meter.adr_building2 ? `, корп. ${meter.adr_building2}` : ''}${meter.adr_fl_of ? `, кв. ${meter.adr_fl_of}` : ''}`;
        }

        meter.tasks = task ? {
            ID: task.ID,
            date: task.date,
            tasks_type: task.tasks_type
        } : null;

        delete meter.adr_building;
        delete meter.adr_building2;
        delete meter.adr_fl_of;
        delete meter.street;

        await con.end();
        return meter;
    } catch (error) {
        console.error('Error DataBase request for |ObjectMeters_chernigiv| : ', error);
        throw error;
    }  
}

async function FetchMeterTypes_chernigiv() {
    try {
        const con = await mysql.createConnection(config.get('MySQL.R145j7_aqua_crm_chernigiv'));
        const query = `
                        SELECT ID, CONCAT(name, ' => DN ', dn) AS meter_type
                        FROM meters_base`;
    
        const [meterTypes] = await con.query(query);
        const formattedMeterTypes = meterTypes.map(type => {
            return { 
                id: type.ID, 
                type: type.meter_type 
            };
        });

        await con.end();
        return formattedMeterTypes;
    } catch (error) {
        console.error('Error DataBase request for |FetchMeterTypes_chernigiv| : ', error);
        throw error;
    }
}

async function FilterMeters_chernigiv(criteria, list) {
    try {
        const con = await mysql.createConnection(config.get('MySQL.R145j7_aqua_crm_chernigiv'));
        let query;
        let countQuery;

        if (list === 'all') {
            const result = await AllMeters_chernigiv(criteria);
            return result;
        } else {
            if (['certificate_date', 'verification_date', 'validity_date'].includes(list)) {
                query = `SELECT DISTINCT CONVERT_TZ(${list}, '+00:00', @@session.time_zone) as ${list} FROM meters`;
                countQuery = `SELECT COUNT(DISTINCT ${list}) as total FROM meters`;
            } else {
                query = `SELECT DISTINCT ${list} FROM meters`;
                countQuery = `SELECT COUNT(DISTINCT ${list}) as total FROM meters`;
            }
        }
        let conditions = [];
        let parameters = [];
        for (let key in criteria) {
            if (criteria[key] && key !== list) {
                if (typeof criteria[key] === 'string' && criteria[key].includes('=>')) {
                    const [startDate, endDate] = criteria[key].split('=>').map(date => {
                        const isoDate = new Date(date.trim()).toISOString().split('T')[0];
                        return isoDate;
                    });
                    conditions.push(`${key} BETWEEN ? AND ?`);
                    parameters.push(startDate, endDate);
                } else {
                    conditions.push(`${key} = ?`);
                    parameters.push(criteria[key]);
                }
            }
        }
        if (conditions.length > 0) {
            query += ` WHERE ${conditions.join(' AND ')}`;
            countQuery += ` WHERE ${conditions.join(' AND ')}`;
        }
        if (list !== 'all') {
            query += ` ORDER BY ${list}`;
        }

        query += ` LIMIT 100`;

        const [countResults] = await con.query(countQuery, parameters);
        const totalRecords = countResults[0].total;
        const [results] = await con.query(query, parameters);

        if (list === 'all') {
            for (const meter of results) {
                meter.address = {
                    street: meter.street,
                    building: meter.adr_building,
                    building2: meter.adr_building2 || '',
                    flat_or_office: meter.adr_fl_of || ''
                };
                meter.type_id = meter.meter_type_name;
            }
            await con.end();
            return { data: results.filter(item => item[list] !== null), totalRecords, filteredRecords: totalRecords, displayedRecords: results.length };
        } else {
            let values;
            if (list === 'type_id') {
                values = await Promise.all(results.map(async item => {
                    const [result] = await con.query(`SELECT ID, CONCAT(name, ' => ', dn) AS description FROM meters_base WHERE ID = ?`, [item[list]]);
                    if (result.length > 0) {
                        return { id: result[0].ID, value: result[0].description };
                    } else {
                        return null;
                    }
                }));
                values = values.filter(v => v !== null).sort((a, b) => a.value.localeCompare(b.value));
            } else if (list === 'address_id') {
                values = await Promise.all(results.map(async item => {
                    const [address] = await con.query(` SELECT addresses.*, CONCAT(street_base.type, ' ', street_base.name, ', буд. ', addresses.adr_building, 
                                                        IF(addresses.adr_building2 != '0' AND addresses.adr_building2 != '', CONCAT(', корп. ', addresses.adr_building2), ''), 
                                                        IF(addresses.adr_fl_of != '0' AND addresses.adr_fl_of != '', CONCAT(', кв. ', addresses.adr_fl_of), '')) AS description 
                                                    FROM addresses 
                                                    JOIN street_base ON addresses.adr_street_id = street_base.ID 
                                                    WHERE addresses.ID = ?`, [item[list]]);
                    if (address.length > 0) {
                        return { id: address[0].ID, value: address[0].description };
                    } else {
                        return null;
                    }
                }));
                values = values.filter(v => v !== null).sort((a, b) => a.value.localeCompare(b.value));
            } else {
                // values = results.map(item => item[list] ? item[list] : null);
                values = results.length > 0 ? results.map(item => item[list]).filter(value => value !== null) : [null];
            }

            await con.end();
            return { data: values, totalRecords, displayedRecords: values.length };
        }
    } catch (error) {
        console.error('Error in FilterMeters database request: ', error);
        throw error;
    }
}

async function FetchMeterAddresses_chernigiv(criteria = '') {
    try {
        const con = await mysql.createConnection(config.get('MySQL.R145j7_aqua_crm_chernigiv'));

        let query = `
            SELECT 
                a.ID,
                CONCAT(sb.type, " ", sb.name) AS street,
                a.adr_building,
                a.adr_building2,
                a.adr_fl_of
            FROM addresses a
            LEFT JOIN street_base sb ON a.adr_street_id = sb.ID`;

        let queryParams = [];
        if (criteria) {
            const criteriaParts = criteria.split(' ').map(part => `%${part}%`);
            const whereClauses = criteriaParts.map(() => `
                CONCAT(
                    IFNULL(sb.type, ''), ' ', 
                    IFNULL(sb.name, ''), ' ', 
                    IFNULL(a.adr_building, ''), ' ', 
                    IFNULL(a.adr_building2, ''), ' ', 
                    IFNULL(a.adr_fl_of, '')
                ) LIKE ?
            `).join(' AND ');

            query += ` WHERE ${whereClauses}`;
            queryParams = criteriaParts;
        }
        query += ' LIMIT 100';
        const [addresses] = await con.query(query, queryParams);
        const formattedAddresses = addresses.map(address => {
            let fullAddress = `${address.street} буд. ${address.adr_building}`;
            if (address.adr_building2 && address.adr_building2 !== '0') {
                fullAddress += ` корпус ${address.adr_building2}`;
            }
            if (address.adr_fl_of) {
                fullAddress += `, кв. ${address.adr_fl_of}`;
            }
            return { 
                id: address.ID, 
                address: fullAddress 
            };
        });
        await con.end();
        return formattedAddresses;
    } catch (error) {
        console.error('Error DataBase request for |FetchMeterAddresses_chernigiv| : ', error);
        throw error;
    }
}

module.exports = {  AllMeters,
                    AllMeters_chernigiv,
                    SearchMeters_chernigiv,
                    ObjectMeters_chernigiv,
                    FetchMeterTypes_chernigiv,
                    FilterMeters_chernigiv,
                    FetchMeterAddresses_chernigiv };