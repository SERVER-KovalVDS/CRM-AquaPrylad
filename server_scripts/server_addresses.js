const mysql = require('mysql2/promise');
const config = require('config');

async function AllAdresses_sumy() {
    let con;
    let conBases;
    try {
        con = await mysql.createConnection(config.get('MySQL.R145j7_aqua_crm'));
        const [addresses] = await con.query('SELECT * FROM adresses');
        conBases = await mysql.createConnection(config.get('MySQL.R145j7_bases'));

        for (const address of addresses) {
            const [streetData] = await conBases.query('SELECT * FROM street_base WHERE ID = ?', [address.adr_street_id]);
            if (streetData.length > 0) {
                address.street = {
                    new_name: streetData[0].new_name,
                    old_name: streetData[0].old_name,
                    district: streetData[0].district.toString()
                };
            }

            const [metersData] = await con.query('SELECT number FROM meters WHERE adress_id = ?', [address.ID]);
            if (metersData.length > 0) {
                address.meters = metersData.map(meter => ({ number: meter.number }));
            }

            const [tasksData] = await con.query('SELECT date, type FROM tasks WHERE adress_id = ?', [address.ID]);
            if (tasksData.length > 0) {
                address.tasks = tasksData.map(task => ({ date: task.date, type: task.type }));
            }
        }
        return addresses;
    } catch (error) {
        console.error('Error DataBase request: ', error);
        throw error;
    } finally {
        if (con) {
            await con.end();
        }
        if (conBases) {
            await conBases.end();
        }
    }
}

async function AllStreets_sumy() {
    let conBases;
    try {
        conBases = await mysql.createConnection(config.get('MySQL.R145j7_bases'));
        const [streetsData] = await conBases.query('SELECT ID, new_name, old_name FROM street_base');

        const streets = streetsData.map(street => {
            let streetName = street.new_name;
            if (street.old_name !== '0') {
                streetName += ` (${street.old_name})`;
            }
            return {
                ID: street.ID,
                street: streetName
            };
        });

        return streets;
    } catch (error) {
        console.error('Error fetching streets from DB: ', error);
        throw error;
    } finally {
        if (conBases) {
            await conBases.end();
        }
    }
}

async function AllAdresses_chernigiv(criteria = {}, limit = 100, offset = 0) {
    let con;
    try {
        con = await mysql.createConnection(config.get('MySQL.R145j7_aqua_crm_chernigiv'));
        const countQuery = `SELECT COUNT(*) as total FROM addresses`;
        const [countResult] = await con.query(countQuery);
        const totalRecords = countResult[0].total;
        let filterCountQuery = `SELECT COUNT(*) as total FROM addresses a`;
        let filterParameters = [];
        let conditions = [];
        for (let key in criteria) {
            if (criteria[key]) {
                if (key === 'street') {
                    conditions.push(`a.adr_street_id = ?`);
                } else {
                    conditions.push(`a.${key} = ?`);
                }
                filterParameters.push(criteria[key]);
            }
        }
        if (conditions.length > 0) {
            filterCountQuery += ` WHERE ${conditions.join(' AND ')}`;
        }
        const [filterCountResult] = await con.query(filterCountQuery, filterParameters);
        const filterRecords = conditions.length > 0 ? filterCountResult[0].total : 'ALL';
        let whereClause = conditions.length > 0 ? ` AND ${conditions.join(' AND ')}` : '';
        const addressesWithTasksQuery = `
            SELECT a.ID, a.adr_street_id, a.adr_building, a.adr_building2, a.adr_fl_of, a.fml, a.phone,
                   CONCAT(sb.type, " ", sb.name) AS street, 
                   (SELECT COUNT(*) FROM meters m WHERE m.address_id = a.ID) AS meters_count
            FROM addresses a
            LEFT JOIN street_base sb ON a.adr_street_id = sb.ID
            WHERE EXISTS (SELECT 1 FROM tasks t WHERE t.address_id = a.ID)
            ${whereClause}
            GROUP BY a.ID
            LIMIT ?
            OFFSET ?
        `;
        const [addressesWithTasks] = await con.query(addressesWithTasksQuery, [...filterParameters, limit, offset]);
        let addressesWithoutTasks = [];
        if (addressesWithTasks.length < limit) {
            const remainingCount = limit - addressesWithTasks.length;
            const addressesWithoutTasksQuery = `
                SELECT a.ID, a.adr_street_id, a.adr_building, a.adr_building2, a.adr_fl_of, a.fml, a.phone,
                       CONCAT(sb.type, " ", sb.name) AS street, 
                       (SELECT COUNT(*) FROM meters m WHERE m.address_id = a.ID) AS meters_count
                FROM addresses a
                LEFT JOIN street_base sb ON a.adr_street_id = sb.ID
                WHERE NOT EXISTS (SELECT 1 FROM tasks t WHERE t.address_id = a.ID)
                ${whereClause}
                GROUP BY a.ID
                LIMIT ?
                OFFSET ?
            `;
            const [addressesWithoutTasksResults] = await con.query(addressesWithoutTasksQuery, [...filterParameters, remainingCount, offset]);
            addressesWithoutTasks = addressesWithoutTasksResults;
        }
        const addresses = [...addressesWithTasks, ...addressesWithoutTasks];
        const addressesWithTasksPromises = addresses.map(async (address) => {
            const tasksCountQuery = `
                SELECT COUNT(*) as tasks_count
                FROM tasks
                WHERE address_id = ?
            `;
            const [tasksCountResult] = await con.query(tasksCountQuery, [address.ID]);
            const tasks_count = tasksCountResult[0].tasks_count;

            const { adr_street_id, meters_count, ...rest } = address;
            return {
                ...rest,
                meters: meters_count,
                tasks: tasks_count
            };
        });
        const addressesWithFullTasks = await Promise.all(addressesWithTasksPromises);
        const sortedAddresses = addressesWithFullTasks.sort((a, b) => {
            if (a.tasks > 0 && b.tasks === 0) {
                return -1;
            } else if (a.tasks === 0 && b.tasks > 0) {
                return 1;
            } else {
                return a.street.localeCompare(b.street);
            }
        });
        return {
            data: sortedAddresses,
            totalRecords: totalRecords,
            filteredRecords: filterRecords,
            displayedRecords: sortedAddresses.length
        };
    } catch (error) {
        console.error('Error DataBase request: ', error);
        throw error;
    } finally {
        if (con) {
            await con.end();
        }
    }
}

async function AllStreets_chernigiv() {
    let conBases;
    try {
        conBases = await mysql.createConnection(config.get('MySQL.R145j7_aqua_crm_chernigiv'));
        const [streetsData] = await conBases.query('SELECT ID, name, type FROM street_base');

        const streets = streetsData.map(street => {
            let streetName = street.type+' '+street.name;
            return {
                ID: street.ID,
                street: streetName
            };
        });

        return streets;
    } catch (error) {
        console.error('Error fetching streets from DB: ', error);
        throw error;
    } finally {
        if (conBases) {
            await conBases.end();
        }
    }
}

async function SearchAddresses_chernigiv(searchQuery) {
    let con;
    try {
        con = await mysql.createConnection(config.get('MySQL.R145j7_aqua_crm_chernigiv'));
        const criteria = searchQuery.split(' ').filter(term => term.length > 0).slice(0, 4);
        let query = `
            SELECT a.ID, 
                   CONCAT(sb.type, " ", sb.name) AS street, 
                   a.adr_building, 
                   a.adr_building2, 
                   a.adr_fl_of
            FROM addresses a
            LEFT JOIN street_base sb ON a.adr_street_id = sb.ID
            WHERE 1=1
        `;

        // Первый критерий - название улицы
        if (criteria[0]) {
            query += ` AND sb.name LIKE '%${criteria[0]}%' `;
        }

        // Второй критерий - номер дома (точное совпадение)
        if (criteria[1]) {
            query += ` AND a.adr_building = '${criteria[1]}' `;
        }

        // Логика для третьего критерия:
        if (criteria[2] && criteria.length === 3) {
            // Если только три критерия, проверяем и корпус, и квартиру
            query += ` AND (a.adr_building2 = '${criteria[2]}' OR a.adr_fl_of = '${criteria[2]}') `;
        } else if (criteria[2] && criteria.length === 4) {
            // Если четыре критерия, третий - корпус
            query += ` AND a.adr_building2 = '${criteria[2]}' `;
        }

        // Четвертый критерий - номер квартиры (точное совпадение)
        if (criteria[3]) {
            query += ` AND a.adr_fl_of = '${criteria[3]}' `;
        }

        query += ` GROUP BY a.ID LIMIT 100;`;

        const [finalResults] = await con.query(query);
        return finalResults;
    } catch (error) {
        console.error('Error DataBase request: ', error);
        throw error;
    } finally {
        if (con) {
            await con.end();
        }
    }
}

async function ObjectAddresses_chernigiv(addressId) {
    let con;
    try {
        con = await mysql.createConnection(config.get('MySQL.R145j7_aqua_crm_chernigiv'));
        const addressQuery = `
            SELECT a.*,
                   CONCAT(sb.type, " ", sb.name) AS street
            FROM addresses a
            LEFT JOIN street_base sb ON a.adr_street_id = sb.ID
            WHERE a.ID = ?
        `;
        const [addressResult] = await con.query(addressQuery, [addressId]);
        if (addressResult.length === 0) {
            return null;
        }
        const address = addressResult[0];

        const metersQuery = `
            SELECT ID, number, service_type, location
            FROM meters
            WHERE address_id = ?
            ORDER BY number ASC
        `;
        const [metersResult] = await con.query(metersQuery, [address.ID]);
        address.meters = metersResult.map(meter => ({
            ID: meter.ID,
            number: meter.number,
            service_type: meter.service_type,
            location: meter.location
        }));

        const tasksQuery = `
            SELECT ID, CONVERT_TZ(date, '+00:00', @@session.time_zone) as date, tasks_type
            FROM tasks
            WHERE address_id = ?
        `;
        const [tasksResult] = await con.query(tasksQuery, [address.ID]);
        address.tasks = tasksResult.map(task => ({
            ID: task.ID,
            date: task.date,
            tasks_type: task.tasks_type
        }));

        address.address = `${address.street}, буд. ${address.adr_building}${address.adr_building2 ? `, корп. ${address.adr_building2}` : ''}${address.adr_fl_of ? `, кв. ${address.adr_fl_of}` : ''}`;
        delete address.adr_street_id;
        delete address.adr_building;
        delete address.adr_building2;
        delete address.adr_fl_of;
        delete address.street;
        return address;
    } catch (error) {
        console.error('Error DataBase request for |ObjectAddresses_chernigiv|: ', error);
        throw error;
    } finally {
        if (con) {
            await con.end();
        }
    }
}

async function FilterAddresses_chernigiv(criteria, list) {
    let con;
    try {
        con = await mysql.createConnection(config.get('MySQL.R145j7_aqua_crm_chernigiv'));
        let query;
        let countQuery;

        if (list === 'all') {
            const result = await AllAdresses_chernigiv(criteria);
            return result;
        } else if (list === 'street') {
            query = `
                SELECT DISTINCT sb.ID as street_id, CONCAT(sb.type, ' ', sb.name) AS street
                FROM street_base sb
                WHERE sb.ID IN (
                    SELECT DISTINCT adr_street_id
                    FROM addresses
            `;
            countQuery = `
                SELECT COUNT(DISTINCT sb.ID) as total
                FROM street_base sb
                WHERE sb.ID IN (
                    SELECT DISTINCT adr_street_id
                    FROM addresses
            `;
        } else {
            query = `SELECT DISTINCT ${list} FROM addresses`;
            countQuery = `SELECT COUNT(DISTINCT ${list}) as total FROM addresses`;
        }

        let conditions = [];
        let parameters = [];
        for (let key in criteria) {
            if (criteria[key] && key !== list) {
                if (key === 'street') {
                    conditions.push(`adr_street_id = ?`);
                } else {
                    conditions.push(`${key} = ?`);
                }
                parameters.push(criteria[key]);
            }
        }

        // Фильтрация по критериям
        if (list === 'street') {
            if (conditions.length > 0) {
                const whereClause = ` WHERE ${conditions.join(' AND ')}`;
                query += ` ${whereClause})`;
                countQuery += ` ${whereClause})`;
            } else {
                query += `)`;
                countQuery += `)`;
            }
        } else {
            if (conditions.length > 0) {
                const whereClause = ` WHERE ${conditions.join(' AND ')}`;
                query += whereClause;
                countQuery += whereClause;
            }
            if (list !== 'all') {
                query += ` ORDER BY ${list}`;
            } else {
                query += ` GROUP BY a.ID LIMIT 100`;
            }
        }
        
        // Получение количества отфильтрованных записей
        const filterCountQuery = countQuery.replace('COUNT(DISTINCT', 'COUNT(');
        const [filterCountResults] = await con.query(filterCountQuery, parameters);
        const filterRecords = conditions.length > 0 ? filterCountResults[0].total : 'ALL';

        const [countResults] = await con.query(countQuery, parameters);
        const totalRecords = countResults[0].total;
        const [results] = await con.query(query, parameters);

        let values;
        if (list === 'street') {
            values = results.map(item => ({ id: item.street_id, value: item.street })).filter(v => v.value !== null);
        } else {
            values = results.map(item => item[list] ? item[list] : null).filter(v => v !== null);
        }

        if (list === 'street') {
            values.sort((a, b) => {
                if (a.value < b.value) return -1;
                if (a.value > b.value) return 1;
                return 0;
            });
        } else {
            values.sort((a, b) => {
                const parseA = isNaN(a) ? a : parseFloat(a);
                const parseB = isNaN(b) ? b : parseFloat(b);
        
                if (typeof parseA === 'number' && typeof parseB === 'number') {
                    return parseA - parseB;
                } else if (typeof parseA === 'number') {
                    return -1;
                } else if (typeof parseB === 'number') {
                    return 1;
                } else {
                    return a.localeCompare(b);
                }
            });
        }
        return { data: values, totalRecords, filteredRecords: filterRecords, displayedRecords: values.length };
    } catch (error) {
        console.error('Error in FilterAddresses database request: ', error);
        throw error;
    } finally {
        if (con) {
            await con.end();
        }
    }
}

async function MetersArrAddresses_chernigiv(criteria) {
    let con;
    try {
        con = await mysql.createConnection(config.get('MySQL.R145j7_aqua_crm_chernigiv'));
        let query = `SELECT ID, number, service_type, location FROM meters`;
        let parameters = [];

        if (criteria) {
            query += ` WHERE number LIKE ?`;
            parameters.push(`%${criteria}%`);
        }

        query += ` LIMIT 100`;

        const [results] = await con.query(query, parameters);
        // Сортировка результатов по полю number
        results.sort((a, b) => a.number.localeCompare(b.number));

        return results.map(meter => ({
            ID: meter.ID,
            number: meter.number,
            service_type: meter.service_type,
            location: meter.location
        }));

    } catch (error) {
        console.error('Error in MetersArrAddresses_chernigiv database request: ', error);
        throw error;
    } finally {
        if (con) {
            await con.end();
        }
    }
}

module.exports = {  AllAdresses_sumy,
                    AllStreets_sumy,
                    AllAdresses_chernigiv,
                    AllStreets_chernigiv,
                    SearchAddresses_chernigiv,
                    ObjectAddresses_chernigiv,
                    FilterAddresses_chernigiv,
                    MetersArrAddresses_chernigiv };
