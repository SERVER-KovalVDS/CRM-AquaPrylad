const mysql = require('mysql2/promise');
const config = require('config');
const fs = require('fs').promises;

async function AllTasks() {
    let conAquaCrm;
    let conBases;
    try {
        conAquaCrm = await mysql.createConnection(config.get('MySQL.R145j7_aqua_crm'));
        conBases = await mysql.createConnection(config.get('MySQL.R145j7_bases'));
        const [tasks] = await conAquaCrm.query('SELECT * FROM tasks');

        for (const task of tasks) {
            const [addressData] = await conAquaCrm.query('SELECT * FROM adresses WHERE id = ?', [task.adress_id]);
            if (addressData.length > 0) {
                const [streetData] = await conBases.query('SELECT old_name, new_name, district FROM street_base WHERE ID = ?', [addressData[0].adr_street_id]);
                if (streetData.length > 0) {
                    task.address = {
                        ...addressData[0],
                        old_name: streetData[0].old_name,
                        new_name: streetData[0].new_name,
                        district: streetData[0].district
                    };
                }
                delete task.address.adr_street_id;
            }

            delete task.adress_id;
        }

        return tasks;
    } catch (error) {
        console.error('Error DataBase request: ', error);
        throw error;
    } finally {
        if (conAquaCrm) {
            await conAquaCrm.end();
        }
        if (conBases) {
            await conBases.end();
        }
    }
}

async function AllTasks_chernigiv(criteria = {}) {
    let con;
    try {
        let statusOrder = [];
        try {
            const data = await fs.readFile('vocabulary.json', 'utf-8');
            const json = JSON.parse(data);
            statusOrder = json.chernigiv.tasks_status || [];
        } catch (error) {
            console.error('Error loading status order from vocabulary.json:', error);
        }

        con = await mysql.createConnection(config.get('MySQL.R145j7_aqua_crm_chernigiv'));
        const countQuery = `SELECT COUNT(*) as total FROM tasks_archive`;
        const [countResult] = await con.query(countQuery);
        const totalRecords = countResult[0].total;
        let filterCountQuery = `SELECT COUNT(*) as total FROM tasks_archive t
                                LEFT JOIN addresses a ON t.address_id = a.ID`;
        let filterParameters = [];
        let conditions = [];

        for (let key in criteria) {
            if (criteria[key]) {
                if (typeof criteria[key] === 'string' && criteria[key].includes('=>')) {
                    const [startDate, endDate] = criteria[key].split('=>').map(date => {
                        const isoDate = new Date(date.trim()).toISOString().split('T')[0];
                        return isoDate;
                    });
                    conditions.push(`t.${key} BETWEEN ? AND ?`);
                    filterParameters.push(startDate, endDate);
                } else {
                    conditions.push(`t.${key} = ?`);
                    filterParameters.push(criteria[key]);
                }
            }
        }

        let whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
        if (conditions.length > 0) {
            filterCountQuery += ` WHERE ${conditions.join(' AND ')}`;
        }
        const [filterCountResult] = await con.query(filterCountQuery, filterParameters);
        const filterRecords = conditions.length > 0 ? filterCountResult[0].total : 'ALL';
        const query = `
            SELECT t.ID, t.address_id, t.tasks_type, t.brigade, t.cost, t.pay_method, t.note, t.meters_id, t.status, 
                   a.adr_building, a.adr_building2, a.adr_fl_of, a.phone, 
                   CONCAT(sb.type, " ", sb.name) AS street,
                   CONVERT_TZ(t.date, '+00:00', @@session.time_zone) as date,
                   CONVERT_TZ(t.work_date, '+00:00', @@session.time_zone) as work_date
            FROM tasks_archive t
            LEFT JOIN addresses a ON t.address_id = a.ID
            LEFT JOIN street_base sb ON a.adr_street_id = sb.ID
            ${whereClause}
            ORDER BY t.ID DESC
            LIMIT 100`;
        let [tasks] = await con.query(query, filterParameters);

        for (const task of tasks) {
            task.date = new Date(task.date);
            task.address = `${task.street}, буд. ${task.adr_building}${task.adr_building2 ? `, корп. ${task.adr_building2}` : ''}${task.adr_fl_of ? `, кв. ${task.adr_fl_of}` : ''}`;
            task.phone = task.phone || '';
        
            const meterIds = task.meters_id ? task.meters_id.split('|') : [];
            const validMeterIds = [];
            const nonumberCount = [];
        
            meterIds.forEach(id => {
                if (id.startsWith('nonumber')) {
                    nonumberCount.push('nonumber');
                } else {
                    validMeterIds.push(id);
                }
            });
        
            if (validMeterIds.length > 0) {
                const metersQuery = `SELECT ID, number FROM meters WHERE ID IN (${validMeterIds.map(() => '?').join(',')})`;
                const [meters] = await con.query(metersQuery, validMeterIds);
                task.meters = meters.map(meter => meter.number);
            } else {
                task.meters = [];
            }
        
            task.meters = [...task.meters, ...nonumberCount];
        
            delete task.street;
            delete task.adr_building;
            delete task.adr_building2;
            delete task.adr_fl_of;
            delete task.meters_id;
        }

        if (statusOrder.length > 0) {
            tasks.sort((a, b) => {
                const statusComparison = statusOrder.indexOf(a.status) - statusOrder.indexOf(b.status); // Сортировка по статусу
                if (statusComparison !== 0) return statusComparison;
                return new Date(b.work_date) - new Date(a.work_date); // Сортировка по work_date
            });
        } else {
            console.warn('Status order is empty or could not be loaded, sorting by status is ignored.');
            tasks.sort((a, b) => new Date(b.work_date) - new Date(a.work_date)); // Сортировка только по work_date
        }

        return {
            data: tasks,
            totalRecords: totalRecords,
            filteredRecords: filterRecords,
            displayedRecords: tasks.length
        };
    } catch (error) {
        console.error('Error DataBase request for |AllTasks_chernigiv| : ', error);
        throw error;
    } finally {
        if (con) {
            await con.end();
        }
    }
}

async function AddressesSearchTasks_chernigiv(searchQuery) {
    let con;
    try {
        con = await mysql.createConnection(config.get('MySQL.R145j7_aqua_crm_chernigiv'));
        const [tasks] = await con.query(`
            SELECT t.ID, 
                   CONVERT_TZ(t.date, '+00:00', @@session.time_zone) as date, 
                   t.tasks_type, 
                   a.ID as address_id, 
                   CONCAT(sb.type, " ", sb.name) AS street, 
                   a.adr_building, a.adr_building2, a.adr_fl_of
            FROM tasks_archive t
            LEFT JOIN addresses a ON t.address_id = a.ID
            LEFT JOIN street_base sb ON a.adr_street_id = sb.ID
        `);
        const criteria = searchQuery.toLowerCase().split(' ').filter(term => term.length > 0);
        let matchingTasks = [];
        for (const task of tasks) {
            let fullAddress = `${task.street}, буд. ${task.adr_building}`;
            if (task.adr_building2 && task.adr_building2 !== '0') {
                fullAddress += `, корп. ${task.adr_building2}`;
            }
            if (task.adr_fl_of && task.adr_fl_of !== '0') {
                fullAddress += `, кв. ${task.adr_fl_of}`;
            }
            let lowerFullAddress = fullAddress.toLowerCase();
            let isMatch = criteria.every(term => {
                return lowerFullAddress.includes(term);
            });

            if (isMatch) {
                matchingTasks.push({
                    ID: task.ID,
                    date: task.date,
                    tasks_type: task.tasks_type,
                    address: fullAddress
                });
            }
        }

        return matchingTasks.slice(0, 100);
    } catch (error) {
        console.error('Error DataBase request: ', error);
        throw error;
    } finally {
        if (con) {
            await con.end();
        }
    }
}

async function MetersSearchTasks_chernigiv(searchQuery) {
    let con;
    try {
        con = await mysql.createConnection(config.get('MySQL.R145j7_aqua_crm_chernigiv'));
        const [tasks] = await con.query(`
            SELECT t.ID, 
                   CONVERT_TZ(t.date, '+00:00', @@session.time_zone) as date, 
                   t.tasks_type, 
                   t.meters_id
            FROM tasks_archive t
        `);
        const criterion = searchQuery.trim();
        let matchingTasks = [];
        for (const task of tasks) {
            const meterIds = task.meters_id 
                ? task.meters_id.split('|')
                    .map(id => parseInt(id, 10))
                    .filter(id => !isNaN(id) && id > 0)  // Оставляем только положительные числа
                : [];

            if (meterIds.length > 0) {
                const [meters] = await con.query(`
                    SELECT ID, number 
                    FROM meters 
                    WHERE ID IN (${meterIds.join(',')})
                `);
                let isMatch = meters.some(meter => meter.number.includes(criterion));
                if (isMatch) {
                    matchingTasks.push({
                        ID: task.ID,
                        date: task.date,
                        tasks_type: task.tasks_type,
                        meterNumbers: meters.map(meter => meter.number)
                    });
                }
            }
        }
        return matchingTasks.slice(0, 100);
    } catch (error) {
        console.error('Error DataBase request: ', error);
        throw error;
    } finally {
        if (con) {
            await con.end();
        }
    }
}

async function ObjectTasks_chernigiv(taskId, tableType) {
    let con;
    try {
        con = await mysql.createConnection(config.get('MySQL.R145j7_aqua_crm_chernigiv'));
        
        // Определяем название таблицы в зависимости от значения tableType
        const tableName = tableType === 'archive' ? 'tasks_archive' : 'tasks';

        const query = `
            SELECT t.*, 
                   a.adr_building, 
                   a.adr_building2, 
                   a.adr_fl_of, 
                   a.phone, 
                   CONCAT(sb.type, " ", sb.name) AS street,
                   CONVERT_TZ(t.date, '+00:00', @@session.time_zone) as date
            FROM ${tableName} t
            LEFT JOIN addresses a ON t.address_id = a.ID
            LEFT JOIN street_base sb ON a.adr_street_id = sb.ID
            WHERE t.ID = ?
        `;
        const [tasks] = await con.query(query, [taskId]);
        if (tasks.length === 0) {
            return null;
        }
        const task = tasks[0];
        task.address = `${task.street}, буд. ${task.adr_building}${task.adr_building2 ? `, корп. ${task.adr_building2}` : ''}${task.adr_fl_of ? `, кв. ${task.adr_fl_of}` : ''}`;
        task.phone = task.phone || '';
        const meterIds = task.meters_id ? task.meters_id.split('|') : [];
        task.meters = [];
        
        if (meterIds.length > 0) {
            const validMeterIds = [];
            const meterIndexMap = {};
        
            // Подготовка к запросу: сохранение индексов и идентификаторов
            meterIds.forEach((id, index) => {
                if (!id.startsWith('nonumber')) {
                    validMeterIds.push(id);
                    meterIndexMap[id] = index; // Сохраняем индекс для сохранения порядка
                } else {
                    const [_, serviceType, locationType] = id.split('_');
                    task.meters[index] = {
                        ID: id,
                        number: 'nonumber',
                        service_type: serviceType === 'cold' ? 1 : serviceType === 'hot' ? 2 : 0,
                        location: locationType === 'kitchen' ? 'Кухня' : 'Ванна'
                    };
                }
            });
        
            // Запрос к БД для валидных идентификаторов
            if (validMeterIds.length > 0) {
                const metersQuery = `SELECT ID, number, service_type, location FROM meters WHERE ID IN (${validMeterIds.map(() => '?').join(',')})`;
                const [meters] = await con.query(metersQuery, validMeterIds);
                meters.forEach(meter => {
                    const index = meterIndexMap[meter.ID];
                    task.meters[index] = {
                        ID: meter.ID,
                        number: meter.number,
                        service_type: meter.service_type,
                        location: meter.location
                    };
                });
            }
        } else {
            task.meters = [];
        }

        delete task.street;
        delete task.adr_building;
        delete task.adr_building2;
        delete task.adr_fl_of;
        delete task.meters_id;
        return task;
    } catch (error) {
        console.error('Error DataBase request for |ObjectTasks_chernigiv| : ', error);
        throw error;
    } finally {
        if (con) {
            await con.end();
        }
    }
}

async function FilterTasks_chernigiv(criteria, list) {
    let con;
    try {
        con = await mysql.createConnection(config.get('MySQL.R145j7_aqua_crm_chernigiv'));
        let query;
        let countQuery;

        if (list === 'all') {
            const result = await AllTasks_chernigiv(criteria);
            return result;
        } else {
            if (list === 'date' || list === 'work_date') {
                query = `SELECT DISTINCT CONVERT_TZ(${list}, '+00:00', @@session.time_zone) as ${list} FROM tasks_archive`;
                countQuery = `SELECT COUNT(DISTINCT ${list}) as total FROM tasks_archive`;
            } else {
                query = `SELECT DISTINCT ${list} FROM tasks_archive`;
                countQuery = `SELECT COUNT(DISTINCT ${list}) as total FROM tasks_archive`;
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
        const filterCountQuery = countQuery.replace('COUNT(DISTINCT', 'COUNT(');
        const [filterCountResults] = await con.query(filterCountQuery, parameters);
        const filterRecords = conditions.length > 0 ? filterCountResults[0].total : 'ALL';
        const [countResults] = await con.query(countQuery, parameters);
        const totalRecords = countResults[0].total;
        if (list === 'all') {
            query += ` LIMIT 100`;
        }
        let [results] = await con.query(query, parameters);
        if (list === 'work_date') {
            results = results.filter(item => item.work_date !== null && item.work_date !== '');
        }
        if (list === 'all') {
            return { data: results, totalRecords, filteredRecords: filterRecords, displayedRecords: results.length };
        } else {
            let values;
            if (list === 'type' || list === 'brigade' || list === 'pay_method' || list === 'status') {
                values = results
                    .map(item => item[list] ? item[list] : null)
                    .filter(value => value !== null)
                    .sort((a, b) => a.localeCompare(b));
            } else if (list === 'address_id') {
                values = await Promise.all(results.map(async item => {
                    const [address] = await con.query(`
                        SELECT addresses.*, CONCAT(street_base.type, ' ', street_base.name, ', буд. ', addresses.adr_building, 
                            IF(addresses.adr_building2 != '0' AND addresses.adr_building2 != '', CONCAT(', корп. ', addresses.adr_building2), ''), 
                            IF(addresses.adr_fl_of != '0' AND addresses.adr_fl_of != '', CONCAT(', кв. ', addresses.adr_fl_of), '')) AS description 
                        FROM addresses 
                        JOIN street_base ON addresses.adr_street_id = street_base.ID 
                        WHERE addresses.ID = ?
                    `, [item[list]]);
                    if (address.length > 0) {
                        return { id: address[0].ID, value: address[0].description };
                    } else {
                        return null;
                    }
                }));
                values = values.filter(v => v !== null).sort((a, b) => a.value.localeCompare(b.value));
            } else {
                values = results.map(item => item[list] ? item[list] : null);
            }
            return { data: values, totalRecords, filteredRecords: filterRecords, displayedRecords: values.length };
        }
    } catch (error) {
        console.error('Error in FilterTasks database request: ', error);
        throw error;
    } finally {
        if (con) {
            await con.end();
        }
    }
}

module.exports = {  AllTasks,
                    AllTasks_chernigiv,
                    AddressesSearchTasks_chernigiv,
                    MetersSearchTasks_chernigiv,
                    ObjectTasks_chernigiv,
                    FilterTasks_chernigiv
                };
