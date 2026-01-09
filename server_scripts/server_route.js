const mysql = require('mysql2/promise');
const ExcelJS = require('exceljs');
const config = require('config');
const fs = require('fs').promises;

const log4js = require("log4js");
log4js.configure(config.get('log4js'));
const logger_database = log4js.getLogger("DataBase");

async function Route_chernigiv(criteria) {
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
        const TaskType = criteria.address?.[0]?.task_type ? `AND t.tasks_type = '${criteria.address?.[0]?.task_type}'` : '';
        const buildComplexCondition = (addressCriteria) => {
            let subConditionParts = [];
            let filterParameters = [];

            addressCriteria.forEach(subCriteria => {
                let localConditionParts = [];

                if (subCriteria.street) {
                    localConditionParts.push(`a.adr_street_id = ?`);
                    filterParameters.push(subCriteria.street);
                }

                if (subCriteria.building_array) {
                    const buildingNumbers = subCriteria.building_array.includes(',') ? 
                                            subCriteria.building_array.split(',').map(num => num.trim()) : 
                                            [subCriteria.building_array.trim()];
                    localConditionParts.push(`CAST(a.adr_building AS UNSIGNED) IN (${buildingNumbers.map(() => '?').join(',')})`);
                    filterParameters.push(...buildingNumbers);
                }

                if (subCriteria.building_start) {
                    const startValue = parseInt(subCriteria.building_start, 10);
                    if (!isNaN(startValue)) {
                        localConditionParts.push(`CAST(a.adr_building AS UNSIGNED) >= ?`);
                        filterParameters.push(startValue);
                    }
                }

                if (subCriteria.building_end) {
                    const endValue = parseInt(subCriteria.building_end, 10);
                    if (!isNaN(endValue)) {
                        localConditionParts.push(`CAST(a.adr_building AS UNSIGNED) <= ?`);
                        filterParameters.push(endValue);
                    }
                }

                if (localConditionParts.length > 0) {
                    subConditionParts.push(`(${localConditionParts.join(' AND ')})`);
                }
            });

            if (subConditionParts.length === 0) {
                subConditionParts.push('1');
            }

            return {
                condition: subConditionParts.join(' OR '),
                parameters: filterParameters
            };
        };

        const queryCommonTasks = (complexCondition, taskType) => `
            SELECT t.ID, t.tasks_type, t.note,
                CONCAT(sb.type, " ", sb.name, ", буд. ", a.adr_building, 
                        IFNULL(CONCAT(", корп. ", a.adr_building2), ""), 
                        IFNULL(CONCAT(", кв. ", a.adr_fl_of), "")) AS address,
                CONVERT_TZ(t.date, '+00:00', @@session.time_zone) as date,
                CONVERT_TZ(t.work_date, '+00:00', @@session.time_zone) as work_date,
                LENGTH(t.meters_id) - LENGTH(REPLACE(t.meters_id, '|', '')) + 1 AS meters,
                a.phone AS phone
            FROM tasks t
            LEFT JOIN addresses a ON t.address_id = a.ID
            LEFT JOIN street_base sb ON a.adr_street_id = sb.ID
            WHERE t.brigade IS NULL 
            ${TaskType}
            AND (${complexCondition})
            ORDER BY t.ID DESC
            LIMIT 100`;

        const queryPersonalTasks = (brigade, excludeDate) => `
            SELECT t.ID, t.tasks_type, t.note,
                CONCAT(sb.type, " ", sb.name, ", буд. ", a.adr_building, 
                        IFNULL(CONCAT(", корп. ", a.adr_building2), ""), 
                        IFNULL(CONCAT(", кв. ", a.adr_fl_of), "")) AS address,
                LENGTH(t.meters_id) - LENGTH(REPLACE(t.meters_id, '|', '')) + 1 AS meters,
                CONVERT_TZ(t.work_date, '+00:00', @@session.time_zone) as work_date
            FROM tasks t
            LEFT JOIN addresses a ON t.address_id = a.ID
            LEFT JOIN street_base sb ON a.adr_street_id = sb.ID
            WHERE t.brigade = '${brigade}'
            AND (t.work_date != '${excludeDate}' OR t.work_date IS NULL)
            ORDER BY t.ID DESC
            LIMIT 100`;

        const queryDateTasks = (brigade, workDate) => `
            SELECT t.ID, t.tasks_type, t.note,
                   CONCAT(sb.type, " ", sb.name, ", буд. ", a.adr_building, 
                          IFNULL(CONCAT(", корп. ", a.adr_building2), ""), 
                          IFNULL(CONCAT(", кв. ", a.adr_fl_of), "")) AS address,
                   LENGTH(t.meters_id) - LENGTH(REPLACE(t.meters_id, '|', '')) + 1 AS meters,
                   CONVERT_TZ(t.work_date, '+00:00', @@session.time_zone) as work_date
            FROM tasks t
            LEFT JOIN addresses a ON t.address_id = a.ID
            LEFT JOIN street_base sb ON a.adr_street_id = sb.ID
            WHERE t.brigade = '${brigade}' AND t.work_date = '${workDate}'
            ORDER BY t.ID DESC
            LIMIT 100`;

        const sortTasks = (tasks, taskType) => {
            if (statusOrder.length > 0) {
                tasks.sort((a, b) => {
                    const dateComparison = new Date(b.date) - new Date(a.date);
                    if (dateComparison !== 0) return dateComparison;
                    return statusOrder.indexOf(a.status) - statusOrder.indexOf(b.status);
                });
            } else {
                console.warn('Status order is empty or could not be loaded, sorting by status is ignored.');
            }

            return tasks.map(task => {
                switch (taskType) {
                    case 'common':
                        return {
                            ID: task.ID,
                            address: task.address,
                            phone: task.phone,
                            meters: task.meters,
                            date: task.date,
                            tasks_type: task.tasks_type,
                            work_date: task.work_date,
                            note: task.note
                        };
                    case 'personal':
                    case 'date':
                        return {
                            ID: task.ID,
                            address: task.address,
                            meters: task.meters,
                            tasks_type: task.tasks_type,
                            work_date: task.work_date,
                            note: task.note
                        };
                }
            });
        };

        const { worker, address } = criteria;

        let commonTasks = [];
        let personalTasks = [];
        let dateTasks = [];

        const [totalTasksResult] = await con.query(`SELECT COUNT(*) AS total_tasks FROM tasks`);
        const totalTasks = totalTasksResult[0].total_tasks;
        const [brigadeStats] = await con.query(`
            SELECT brigade AS name, COUNT(*) AS value 
            FROM tasks 
            WHERE brigade IS NOT NULL 
            GROUP BY brigade
        `);
        const statistic = [
            { name: 'total_tasks', value: totalTasks },
            ...brigadeStats.map(item => ({ name: item.name, value: item.value })),
            { filter: criteria.address.length > 0 }
        ];

        const { condition, parameters } = buildComplexCondition(address || []);
        const commonQuery = queryCommonTasks(condition);
        [commonTasks] = await con.query(commonQuery, parameters);
        commonTasks = sortTasks(commonTasks, 'common');

        const responseData = {
            action: "routeResponse",
            data: {
                common_tasks: commonTasks,
                statistic: statistic
            }
        };

        if (worker) {
            const { brigade, select_date: SelectDate } = worker;
            [personalTasks] = await con.query(queryPersonalTasks(brigade, SelectDate));
            [dateTasks] = await con.query(queryDateTasks(brigade, SelectDate));
            personalTasks = sortTasks(personalTasks, 'personal');
            dateTasks = sortTasks(dateTasks, 'date');

            const calendarDates = Array.from(new Set(
                personalTasks
                    .filter(task => task.work_date !== null)
                    .map(task => new Date(task.work_date).toISOString().split('T')[0])
            ));

            if (dateTasks.length > 0 && SelectDate) {
                calendarDates.push(SelectDate);
            }

            const uniqueCalendarDates = Array.from(new Set(calendarDates));

            responseData.data.personal_tasks = personalTasks;
            responseData.data.date_tasks = dateTasks;
            responseData.data.calendar_dates = uniqueCalendarDates;
        }

        return responseData;

    } catch (error) {
        console.error('Error DataBase request for |Route_chernigiv| : ', error);
        throw error;
    } finally {
        if (con) {
            await con.end();
        }
    }
}

async function FilterRoute_chernigiv(full_criteria, filter_list) {
    let con;
    try {
        if (filter_list === 'all') {
            const result = await Route_chernigiv(full_criteria);
            return result;
        }

        const criteria = full_criteria.address;
        const TaskType = criteria.task_type ? `AND tasks_type = '${criteria.task_type}'` : '';
        const list = filter_list.substring(1);
        con = await mysql.createConnection(config.get('MySQL.R145j7_aqua_crm_chernigiv'));

        // Шаг 1: Получаем уникальные идентификаторы адресов из таблицы заявок
        let query = `SELECT DISTINCT address_id FROM tasks WHERE brigade IS NULL ${TaskType}`;
        const [addressIds] = await con.query(query);
        const addressIdList = addressIds.map(row => row.address_id);

        if (addressIdList.length === 0) {
            // Если нет идентификаторов адресов, возвращаем пустой результат
            return { data: [], totalRecords: 0, filteredRecords: 0, displayedRecords: 0 };
        }

        let values;
        switch (list) {
            case 'TaskType':
                query = `SELECT DISTINCT tasks_type
                            FROM tasks`;
                values = (await con.query(query))[0].map(row => row.tasks_type);
                break;
            case 'StreetSpesial':
                // Шаг 2: Фильтруем адреса по критериям номеров домов
                query = `SELECT DISTINCT addresses.adr_street_id, CONCAT(street_base.type, ' ', street_base.name) as street_name
                         FROM addresses
                         JOIN street_base ON addresses.adr_street_id = street_base.ID
                         WHERE addresses.ID IN (?)`;

                let streetConditions = [];
                let streetParams = [addressIdList];

                if (criteria.building_array) {
                    const buildingNumbers = criteria.building_array.split(',').map(num => num.trim());
                    streetConditions.push(`CAST(addresses.adr_building AS UNSIGNED) IN (?)`);
                    streetParams.push(buildingNumbers);
                } else if (criteria.building_start || criteria.building_end) {
                    if (criteria.building_start) {
                        streetConditions.push(`CAST(addresses.adr_building AS UNSIGNED) >= ?`);
                        streetParams.push(parseInt(criteria.building_start, 10) || 0);
                    }
                    if (criteria.building_end) {
                        streetConditions.push(`CAST(addresses.adr_building AS UNSIGNED) <= ?`);
                        streetParams.push(parseInt(criteria.building_end, 10) || Number.MAX_SAFE_INTEGER);
                    }
                }

                if (streetConditions.length > 0) {
                    query += ` AND ${streetConditions.join(' AND ')}`;
                }

                query += ` ORDER BY street_name`;

                values = (await con.query(query, streetParams))[0].map(row => ({
                    id: row.adr_street_id,
                    value: row.street_name
                }));
                break;

            case 'ArrBuildingSpesial':
                query = `SELECT DISTINCT addresses.adr_building as building_number
                         FROM addresses
                         WHERE addresses.ID IN (?)`;

                let buildingParams = [addressIdList];

                if (criteria.street) {
                    query += ` AND addresses.adr_street_id = ?`;
                    buildingParams.push(criteria.street);
                }

                if (criteria.building_array) {
                    const excludedBuildings = criteria.building_array.split(',').map(num => num.trim());
                    query += ` AND addresses.adr_building NOT IN (?)`;
                    buildingParams.push(excludedBuildings);
                }

                query += ` ORDER BY CAST(addresses.adr_building AS UNSIGNED)`;

                values = (await con.query(query, buildingParams))[0].map(row => row.building_number);
                break;

            case 'StartBuildingSpesial':
                if (!criteria.building_end) {
                    // Если поле "ДО" пустое, выбираем все возможные номера домов
                    query = `SELECT DISTINCT addresses.adr_building as building_number
                             FROM addresses
                             WHERE addresses.ID IN (?)`;

                    if (criteria.street) {
                        query += ` AND addresses.adr_street_id = ?`;
                        values = (await con.query(query, [addressIdList, criteria.street]))[0].map(row => row.building_number);
                    } else {
                        values = (await con.query(query, [addressIdList]))[0].map(row => row.building_number);
                    }
                } else {
                    query = `SELECT DISTINCT addresses.adr_building as building_number
                             FROM addresses
                             WHERE addresses.ID IN (?) AND CAST(addresses.adr_building AS UNSIGNED) < ?`;

                    if (criteria.street) {
                        query += ` AND addresses.adr_street_id = ?`;
                        const buildingParams = [addressIdList, parseInt(criteria.building_end, 10), criteria.street];
                        values = (await con.query(query, buildingParams))[0].map(row => row.building_number);
                    } else {
                        const buildingParams = [addressIdList, parseInt(criteria.building_end, 10)];
                        values = (await con.query(query, buildingParams))[0].map(row => row.building_number);
                    }
                }
                values.sort((a, b) => a - b);
                break;

            case 'EndBuildingSpesial':
                if (!criteria.building_start) {
                    // Если поле "ОТ" пустое, выбираем все возможные номера домов
                    query = `SELECT DISTINCT addresses.adr_building as building_number
                             FROM addresses
                             WHERE addresses.ID IN (?)`;

                    if (criteria.street) {
                        query += ` AND addresses.adr_street_id = ?`;
                        values = (await con.query(query, [addressIdList, criteria.street]))[0].map(row => row.building_number);
                    } else {
                        values = (await con.query(query, [addressIdList]))[0].map(row => row.building_number);
                    }
                } else {
                    query = `SELECT DISTINCT addresses.adr_building as building_number
                             FROM addresses
                             WHERE addresses.ID IN (?) AND CAST(addresses.adr_building AS UNSIGNED) > ?`;

                    if (criteria.street) {
                        query += ` AND addresses.adr_street_id = ?`;
                        const buildingParams = [addressIdList, parseInt(criteria.building_start, 10), criteria.street];
                        values = (await con.query(query, buildingParams))[0].map(row => row.building_number);
                    } else {
                        const buildingParams = [addressIdList, parseInt(criteria.building_start, 10)];
                        values = (await con.query(query, buildingParams))[0].map(row => row.building_number);
                    }
                }
                values.sort((a, b) => a - b);
                break;

            default:
                throw new Error(`Unknown special list type: ${list}`);
        }

        return {
            action: "routeFilterResponse",
            field: filter_list,
            data: values
        };

    } catch (error) {
        console.error('Error in SpesialFilterTasks_chernigiv database request: ', error);
        throw error;
    } finally {
        if (con) {
            await con.end();
        }
    }
}

async function RouteChange_chernigiv(full_criteria) {
    let con;
    try {
        const criteria = full_criteria.worker;
        con = await mysql.createConnection(config.get('MySQL.R145j7_aqua_crm_chernigiv'));
        const { id, worker, work_date, user: username } = criteria;

        if (!id) {
            throw new Error('ID is required');
        }
        const [taskRows] = await con.query('SELECT brigade, work_date, history, tasks_type, date, address_id FROM tasks WHERE ID = ?', [id]);
        
        if (taskRows.length === 0) {
            throw new Error('Task not found');
        }
        const currentData = taskRows[0];

        const [addressResult] = await con.query(`SELECT CONCAT(sb.type, " ", sb.name, ", буд. ", a.adr_building, 
                                                            IFNULL(CONCAT(", корп. ", a.adr_building2), ""), 
                                                            IFNULL(CONCAT(", кв. ", a.adr_fl_of), "")) AS address
                                                FROM addresses a
                                                LEFT JOIN street_base sb ON a.adr_street_id = sb.ID
                                                WHERE a.ID = ?
                                            `, [currentData.address_id]);
        const address = addressResult.length > 0 ? addressResult[0].address : 'Адрес не найден';
        let currentHistory = currentData.history;
        let query = 'UPDATE tasks SET ';
        const values = [];
        let updateMessage = 'У заявці ';
        const dateFormatOptions = { day: 'numeric', month: 'long', year: 'numeric' };
        const newWorkDateFormatted = work_date ? new Date(work_date).toLocaleDateString('uk-UA', dateFormatOptions) : null;
        const currentWorkDateFormatted = currentData.work_date ? new Date(currentData.work_date).toLocaleDateString('uk-UA', dateFormatOptions) : null;
        const applicationDateFormatted = new Date(currentData.date).toLocaleDateString('uk-UA', dateFormatOptions);
        const logMessagePrefix = `У заявці ${currentData.tasks_type} від ${applicationDateFormatted} за адресою ${address} `;
        let logMessage = '';

        const workerPart = [];
        const datePart = [];

        if ('worker' in criteria) {
            query += 'brigade = ?, ';
            values.push(worker);

            if (currentData.brigade && worker) {
                workerPart.push(`змінено виконавця з ${currentData.brigade} на ${worker}`);
            } else if (!currentData.brigade && worker) {
                workerPart.push(`додано виконавця ${worker}`);
            } else if (currentData.brigade && !worker) {
                workerPart.push(`видалено виконавця ${currentData.brigade}`);
            }
        }

        if ('work_date' in criteria) {
            query += 'work_date = ?, ';
            values.push(work_date);

            if (currentData.work_date && work_date) {
                datePart.push(`змінено дату виконання з ${currentWorkDateFormatted} на ${newWorkDateFormatted}`);
            } else if (!currentData.work_date && work_date) {
                datePart.push(`додано дату виконання ${newWorkDateFormatted}`);
            } else if (currentData.work_date && !work_date) {
                datePart.push(`видалено дату виконання ${currentWorkDateFormatted}`);
            }
        }

        let status;
        if ('worker' in criteria) {
            if (!criteria.worker) {
                status = 'Нова заявка';
            } else {
                if ('work_date' in criteria) {
                    if (!criteria.work_date) {
                        status = 'Призначено виконавця';
                    } else {
                        status = 'В маршруті';
                    }
                } else {
                    status = 'Призначено виконавця';
                }
            }
        } else if ('work_date' in criteria) {
            if (criteria.work_date) {
                status = 'В маршруті';
            } else {
                status = 'Призначено виконавця';
            }
        }

        query += 'status = ? ';
        values.push(status);

        query += 'WHERE ID = ?';
        values.push(id);

        const [result] = await con.query(query, values);
        if (result.affectedRows === 0) {
            throw new Error('No rows were updated');
        }

        if (workerPart.length > 0) {
            updateMessage += workerPart.join(' і ');
            logMessage += workerPart.join(' і ');
        }

        if (datePart.length > 0) {
            if (workerPart.length > 0) {
                updateMessage += ' та ';
                logMessage += ' та ';
            }
            updateMessage += datePart.join(' і ');
            logMessage += datePart.join(' і ');
        }

        const currentDateTime = new Date().toLocaleString('uk-UA', { timeZone: 'Europe/Kiev' }).replace(',', '').slice(0, -3);
        const processType = 'Маршрут';
        const historyEntry = {
            datetime: currentDateTime,
            process: processType,
            user: username,
            value: updateMessage
        };

        let history = [];
        if (currentHistory) {
            history = JSON.parse(currentHistory);
            if (!Array.isArray(history)) {
                throw new Error('Invalid history format');
            }
        }
        history.push(historyEntry);
        const updatedHistory = JSON.stringify(history);
        await con.query('UPDATE tasks SET history = ? WHERE ID = ?', [updatedHistory, id]);

        logger_database.info(logMessagePrefix + logMessage + ` користувачем [${username}].`);

        const routeData = await Route_chernigiv(full_criteria);
        return routeData;
    } catch (error) {
        console.error('Error updating task in RouteChange_chernigiv:', error);
        throw error;
    } finally {
        if (con) {
            await con.end();
        }
    }
}

async function FetchTasksAddresses_chernigiv(criteria = '') {
    let con;
    try {
        con = await mysql.createConnection(config.get('MySQL.R145j7_aqua_crm_chernigiv'));
        let query = `
            SELECT 
                a.ID,
                CONCAT(sb.type, " ", sb.name) AS street,
                a.adr_building,
                a.adr_building2,
                a.adr_fl_of,
                a.phone
            FROM addresses a
            LEFT JOIN street_base sb ON a.adr_street_id = sb.ID
            WHERE 1=1
        `;
        let queryParams = [];
        
        if (criteria) {
            const criteriaParts = criteria.split(' ').filter(part => part.length > 0).slice(0, 4);

            // Первый критерий - название улицы
            if (criteriaParts[0]) {
                query += ` AND sb.name LIKE ?`;
                queryParams.push(`%${criteriaParts[0]}%`);
            }

            // Второй критерий - номер дома (точное совпадение)
            if (criteriaParts[1]) {
                query += ` AND a.adr_building = ?`;
                queryParams.push(criteriaParts[1]);
            }

            // Логика для третьего критерия
            if (criteriaParts[2] && criteriaParts.length === 3) {
                // Если только три критерия, проверяем и корпус, и квартиру
                query += ` AND (a.adr_building2 = ? OR a.adr_fl_of = ?)`;
                queryParams.push(criteriaParts[2], criteriaParts[2]);
            } else if (criteriaParts[2] && criteriaParts.length === 4) {
                // Если четыре критерия, третий - корпус
                query += ` AND a.adr_building2 = ?`;
                queryParams.push(criteriaParts[2]);
            }

            // Четвертый критерий - номер квартиры (точное совпадение)
            if (criteriaParts[3]) {
                query += ` AND a.adr_fl_of = ?`;
                queryParams.push(criteriaParts[3]);
            }
        }
        
        query += ' LIMIT 100';
        const [addresses] = await con.query(query, queryParams);
        if (addresses.length === 0) {
            return [];
        }

        const addressIds = addresses.map(address => address.ID);

        let metersQuery = `
            SELECT
                m.ID,
                m.number,
                m.service_type,
                m.location,
                m.address_id
            FROM meters m
            WHERE m.address_id IN (?)`;
        const [meters] = await con.query(metersQuery, [addressIds]);

        let tasksQuery = `
            SELECT 
                ID, meters_id 
            FROM tasks 
            WHERE address_id IN (?)`;
        const [tasks] = await con.query(tasksQuery, [addressIds]);

        const formattedAddresses = addresses.map(address => {
            let fullAddress = `${address.street} ${address.adr_building}`;
            if (address.adr_building2 && address.adr_building2 !== '0') {
                fullAddress += ` корпус ${address.adr_building2}`;
            }
            if (address.adr_fl_of) {
                fullAddress += `, кв. ${address.adr_fl_of}`;
            }
            const addressMeters = meters
                .filter(meter => meter.address_id === address.ID)
                .map(meter => {
                    let meterTasks = 'disable';
                    for (const task of tasks) {
                        if (task.meters_id && task.meters_id.split('|').includes(String(meter.ID))) {
                            meterTasks = 'enable';
                            break;
                        }
                    }
                    return {
                        id: meter.ID,
                        number: meter.number,
                        service_type: meter.service_type,
                        location: meter.location,
                        tasks: meterTasks
                    };
                });
            return { 
                id: address.ID, 
                address: fullAddress,
                phone: address.phone,
                meters: addressMeters
            };
        });

        return formattedAddresses;
    } catch (error) {
        console.error('Error DataBase request for |FetchTasksAddresses_chernigiv| : ', error);
        throw error;
    } finally {
        if (con) {
            await con.end();
        }
    }
}

async function RoutePrint_chernigiv(criteria) {
    let con;
    try {
        con = await mysql.createConnection(config.get('MySQL.R145j7_aqua_crm_chernigiv'));
        const query = `
            SELECT 
                t.address_id, 
                t.meters_id, 
                t.cost, 
                t.pay_method, 
                t.note
            FROM tasks t
            WHERE t.brigade = ? AND t.work_date = ?
        `;
        const [tasks] = await con.query(query, [criteria.worker, criteria.work_date]);
        for (const task of tasks) {
            const [addressResult] = await con.query(`
                SELECT CONCAT(sb.type, " ", sb.name, ", буд. ", a.adr_building, 
                              IFNULL(CONCAT(", корп. ", a.adr_building2), ""), 
                              IFNULL(CONCAT(", кв. ", a.adr_fl_of), "")) AS address,
                       a.fml, a.phone
                FROM addresses a
                LEFT JOIN street_base sb ON a.adr_street_id = sb.ID
                WHERE a.ID = ?
            `, [task.address_id]);

            if (addressResult.length > 0) {
                task.address = addressResult[0].address;
                task.fml = addressResult[0].fml;
                task.phone = addressResult[0].phone;
            } else {
                task.address = null;
                task.fml = null;
                task.phone = null;
            }

            const meterIds = task.meters_id ? task.meters_id.split('|') : [];
            task.meters_count = meterIds.length > 0 ? meterIds.length : null;

            delete task.address_id;
            delete task.meters_id;
        }
        return {
            action: "routePrintResponse",
            data: tasks
        };
    } catch (error) {
        console.error('Error DataBase request for |RoutePrint_chernigiv| : ', error);
        throw error;
    } finally {
        if (con) {
            await con.end();
        }
    }
}

async function RouteExcel_chernigiv(criteria) {
    let con;
    try {
        con = await mysql.createConnection(config.get('MySQL.R145j7_aqua_crm_chernigiv'));
        const query = `
            SELECT 
                t.address_id, 
                t.meters_id, 
                t.cost, 
                t.pay_method, 
                t.note
            FROM tasks t
            WHERE t.brigade = ? AND t.work_date = ?
        `;
        const [tasks] = await con.query(query, [criteria.worker, criteria.work_date]);

        for (const task of tasks) {
            const [addressResult] = await con.query(`
                SELECT CONCAT(sb.type, " ", sb.name) AS street_name, 
                       a.adr_building AS building,
                       a.adr_building2 AS building2, 
                       a.adr_fl_of AS apartment,
                       a.fml, 
                       a.phone
                FROM addresses a
                LEFT JOIN street_base sb ON a.adr_street_id = sb.ID
                WHERE a.ID = ?
            `, [task.address_id]);

            if (addressResult.length > 0) {
                task.street_name = addressResult[0].street_name;
                task.building = addressResult[0].building2 ? `${addressResult[0].building}/${addressResult[0].building2}` : addressResult[0].building;
                task.apartment = addressResult[0].apartment;
                task.fml = addressResult[0].fml;
                task.phone = formatPhoneNumber(addressResult[0].phone);
            } else {
                task.street_name = null;
                task.building = null;
                task.apartment = null;
                task.fml = null;
                task.phone = null;
            }

            const meterIds = task.meters_id ? task.meters_id.split('|') : [];
            task.meters_count = meterIds.length > 0 ? meterIds.length : null;

            delete task.address_id;
            delete task.meters_id;
        }

        function formatPhoneNumber(phoneString) {
            return phoneString.split('|').map(phone => {
                if (phone.length === 10) {
                    const prefix = phone.slice(0, 3);
                    const number = phone.slice(3);
                    return `+38 (${prefix}) ${number.slice(0, 3)}-${number.slice(3, 5)}-${number.slice(5)}`;
                } else if (phone.length === 6) {
                    return `+38 (0462) ${phone.slice(0, 2)}-${phone.slice(2, 4)}-${phone.slice(4)}`;
                } else {
                    return phone;
                }
            }).join('\r\n');
        }

        const [year, month, day] = criteria.work_date.split('-');
        const formattedDate = `${day}.${month}.${year}`;
        const bgColor = 'FF4F71BE';
        const fontColor = 'FFFFFFFF';
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Отчет');

        let currentRow = 1;

        worksheet.columns = [
            { header: '№', key: 'number', width: 5 },
            { header: 'Вулиця', key: 'street_name', width: 30 },
            { header: 'Дім', key: 'building', width: 6 },
            { header: 'Кв.', key: 'apartment', width: 8 },
            { header: 'Телефон', key: 'phone', width: 18 },
            { header: 'К-ть', key: 'meters_count', width: 5 },
            { header: 'Примітки', key: 'note', width: 50 },
            { header: 'Сума', key: 'cost', width: 8 },
            { header: 'ФІО замовника', key: 'fml', width: 22 },
            { header: '№ файлів', key: 'files', width: 25 }
        ];

        worksheet.mergeCells(`A${currentRow}:J${currentRow}`);
        const titleCell = worksheet.getCell(`A${currentRow}`);
        titleCell.value = `Маршрут на ${formattedDate} для ${criteria.worker}`;
        titleCell.font = { bold: true, size: 16, color: { argb: fontColor } };
        titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
        titleCell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: bgColor }
        };
        titleCell.border = {
            top: { style: 'thick' },
            left: { style: 'thick' },
            bottom: { style: 'thin' },
            right: { style: 'thick' }
        };
        worksheet.getRow(currentRow).height = 25;
        currentRow++;

        const headers = ['№', 'Вулиця', 'Дім', 'Кв.', 'Телефон', 'К-ть', 'Примітки', 'Сума', 'ФІО замовника', '№ файлів'];
        headers.forEach((header, index) => {
            const cell = worksheet.getCell(`${String.fromCharCode(65 + index)}${currentRow}`);
            cell.value = header;
            cell.font = { bold: true };
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
            if (header === '№') {
                cell.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: bgColor }
                };
                cell.font.color = { argb: fontColor };
                cell.border = {
                    top: { style: 'thin' },
                    left: { style: 'thick' },
                    bottom: { style: 'thin' },
                    right: { style: 'thin' }
                };
            } else if (header === '№ файлів') {
                cell.border = {
                    top: { style: 'thin' },
                    left: { style: 'thin' },
                    bottom: { style: 'thin' },
                    right: { style: 'thick' }
                };
            } else {
                cell.border = {
                    top: { style: 'thin' },
                    left: { style: 'thin' },
                    bottom: { style: 'thin' },
                    right: { style: 'thin' }
                };
            }
        });
        worksheet.getRow(currentRow).height = 25;
        currentRow++;

        tasks.forEach((task, index) => {
            worksheet.getCell(`A${currentRow}`).value = index + 1;
            worksheet.getCell(`A${currentRow}`).fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: bgColor }
            };
            worksheet.getCell(`A${currentRow}`).font = { color: { argb: fontColor } };
            worksheet.getCell(`A${currentRow}`).alignment = { horizontal: 'center', vertical: 'middle' };
            worksheet.getCell(`A${currentRow}`).border =    {   top: { style: 'thin' },
                                                                left: { style: 'thick' },
                                                                bottom: { style: 'thin' },
                                                                right: { style: 'thin' }
                                                            };
        
            worksheet.getCell(`B${currentRow}`).value = task.street_name;
            worksheet.getCell(`B${currentRow}`).alignment = { vertical: 'middle' };
            worksheet.getCell(`B${currentRow}`).border =    {   top: { style: 'thin' },
                                                                left: { style: 'thin' },
                                                                bottom: { style: 'thin' },
                                                                right: { style: 'thin' }
                                                            };
        
            worksheet.getCell(`C${currentRow}`).value = task.building;
            worksheet.getCell(`C${currentRow}`).alignment = { horizontal: 'center', vertical: 'middle' };
            worksheet.getCell(`C${currentRow}`).border =    {   top: { style: 'thin' },
                                                                left: { style: 'thin' },
                                                                bottom: { style: 'thin' },
                                                                right: { style: 'thin' }
                                                            };
        
            worksheet.getCell(`D${currentRow}`).value = task.apartment;
            worksheet.getCell(`D${currentRow}`).alignment = { horizontal: 'center', vertical: 'middle' };
            worksheet.getCell(`D${currentRow}`).border =    {   top: { style: 'thin' },
                                                                left: { style: 'thin' },
                                                                bottom: { style: 'thin' },
                                                                right: { style: 'thin' }
                                                            };
        
            worksheet.getCell(`E${currentRow}`).value = task.phone;
            worksheet.getCell(`E${currentRow}`).alignment = { horizontal: 'center', vertical: 'middle' };
            worksheet.getCell(`E${currentRow}`).alignment.wrapText = true;
            worksheet.getCell(`E${currentRow}`).border =    {   top: { style: 'thin' },
                                                                left: { style: 'thin' },
                                                                bottom: { style: 'thin' },
                                                                right: { style: 'thin' }
                                                            };
        
            worksheet.getCell(`F${currentRow}`).value = task.meters_count;
            worksheet.getCell(`F${currentRow}`).alignment = { horizontal: 'center', vertical: 'middle' };
            worksheet.getCell(`F${currentRow}`).border =    {   top: { style: 'thin' },
                                                                left: { style: 'thin' },
                                                                bottom: { style: 'thin' },
                                                                right: { style: 'thin' }
                                                            };
        
            worksheet.getCell(`G${currentRow}`).value = task.note;
            worksheet.getCell(`G${currentRow}`).alignment = { vertical: 'middle' };
            worksheet.getCell(`G${currentRow}`).border =    {   top: { style: 'thin' },
                                                                left: { style: 'thin' },
                                                                bottom: { style: 'thin' },
                                                                right: { style: 'thin' }
                                                            };
        
            worksheet.getCell(`H${currentRow}`).value = task.cost;
            worksheet.getCell(`H${currentRow}`).alignment = { horizontal: 'center', vertical: 'middle' };
            worksheet.getCell(`H${currentRow}`).border =    {   top: { style: 'thin' },
                                                                left: { style: 'thin' },
                                                                bottom: { style: 'thin' },
                                                                right: { style: 'thin' }
                                                            };
        
            worksheet.getCell(`I${currentRow}`).value = task.fml;
            worksheet.getCell(`I${currentRow}`).alignment = { horizontal: 'center', vertical: 'middle' };
            worksheet.getCell(`I${currentRow}`).alignment.wrapText = true;
            worksheet.getCell(`I${currentRow}`).border =    {   top: { style: 'thin' },
                                                                left: { style: 'thin' },
                                                                bottom: { style: 'thin' },
                                                                right: { style: 'thin' }
                                                            };
        
            worksheet.getCell(`J${currentRow}`).alignment = { horizontal: 'center', vertical: 'middle' };
            worksheet.getCell(`J${currentRow}`).border =    {   top: { style: 'thin' },
                                                                left: { style: 'thin' },
                                                                bottom: { style: 'thin' },
                                                                right: { style: 'thick' }
                                                            };
        
            currentRow++;
        });

        const summaryRow = currentRow;
        worksheet.getCell(`A${summaryRow}`).border =    {   top: { style: 'thin' },
                                                            left: { style: 'thick' },
                                                            bottom: { style: 'thick' }
                                                        };

        worksheet.getCell(`B${summaryRow}`).border =    {   top: { style: 'thin' },
                                                            bottom: { style: 'thick' }
                                                        };

        worksheet.getCell(`C${summaryRow}`).border =    {   top: { style: 'thin' },
                                                            bottom: { style: 'thick' }
                                                        };

        worksheet.getCell(`D${summaryRow}`).border =    {   top: { style: 'thin' },
                                                            bottom: { style: 'thick' },
                                                            right: { style: 'thin' }
                                                        };

        worksheet.getCell(`E${summaryRow}`).value = 'Загалом:';
        worksheet.getCell(`E${summaryRow}`).font = { bold: true };
        worksheet.getCell(`E${summaryRow}`).alignment = { horizontal: 'right', vertical: 'middle' };
        worksheet.getCell(`E${summaryRow}`).border =    {   top: { style: 'thin' },
                                                            left: { style: 'thin' },
                                                            bottom: { style: 'thick' },
                                                            right: { style: 'thin' }
                                                        };

        worksheet.getCell(`F${summaryRow}`).value = { formula: `SUM(F3:F${summaryRow - 1})` };
        worksheet.getCell(`F${summaryRow}`).font = { bold: true };
        worksheet.getCell(`F${summaryRow}`).alignment = { horizontal: 'center', vertical: 'middle' };
        worksheet.getCell(`F${summaryRow}`).border =    {   top: { style: 'thin' },
                                                            left: { style: 'thin' },
                                                            bottom: { style: 'thick' },
                                                            right: { style: 'thin' }
                                                        };
    
        worksheet.getCell(`G${summaryRow}`).border =    {   top: { style: 'thin' },
                                                            left: { style: 'thin' },
                                                            bottom: { style: 'thick' },
                                                            right: { style: 'thin' }
                                                        };

        worksheet.getCell(`H${summaryRow}`).value = { formula: `SUM(H3:H${summaryRow - 1})` };
        worksheet.getCell(`H${summaryRow}`).font = { bold: true };
        worksheet.getCell(`H${summaryRow}`).alignment = { horizontal: 'center', vertical: 'middle' };
        worksheet.getCell(`H${summaryRow}`).border =    {   top: { style: 'thin' },
                                                            left: { style: 'thin' },
                                                            bottom: { style: 'thick' },
                                                            right: { style: 'thin' }
                                                        };

        worksheet.getCell(`I${summaryRow}`).border =    {   top: { style: 'thin' },
                                                            left: { style: 'thin' },
                                                            bottom: { style: 'thick' }
                                                        };

        worksheet.getCell(`J${summaryRow}`).border =    {   top: { style: 'thin' },
                                                            bottom: { style: 'thick' },
                                                            right: { style: 'thick' }
                                                        };
        worksheet.getRow(currentRow).height = 20;

        const vocabularyData = await fs.readFile('vocabulary.json', 'utf-8');
        const vocabulary = JSON.parse(vocabularyData);
        const station = vocabulary.chernigiv.worker_stations.find(w => w.name === criteria.worker)?.station || criteria.worker;
        const fileName = `Маршрут на ${formattedDate} ${station}.xlsx`;

        const buffer = await workbook.xlsx.writeBuffer();
        const base64File = buffer.toString('base64');

        return {
            action: "routeExcelResponse",
            status: "success",
            message: "Файл згенеровано успішно.",
            file_name: fileName,
            file_content: base64File
        };
    } catch (error) {
        console.error('Error DataBase request for |RouteExcel_chernigiv| : ', error);
        return {
            action: "routeExcelResponse",
            status: "error",
            message: 'Error generating report',
        };
    } finally {
        if (con) {
            await con.end();
        }
    }
}

module.exports = {  Route_chernigiv,
                    FilterRoute_chernigiv,
                    RouteChange_chernigiv,
                    FetchTasksAddresses_chernigiv,
                    RoutePrint_chernigiv,
                    RouteExcel_chernigiv
                };
