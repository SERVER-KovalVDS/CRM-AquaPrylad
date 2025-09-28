const mysql = require('mysql2/promise');
const config = require('config');
const crypto = require('crypto');

const log4js = require("log4js");
log4js.configure(config.get('log4js'));
const logger_database = log4js.getLogger("DataBase");


async function OperatorList_chernigiv() {
    const con = await mysql.createConnection(config.get('MySQL.R145j7_aqua_crm'));

    try {
        const [rows] = await con.execute(`
            SELECT login, CONCAT(name1, ' ', name2) as full_name 
            FROM users 
            WHERE role = 'operator_chernigiv'
        `);

        const users = rows.map(row => ({ login: row.login, name: row.full_name }));

        return { users };
    } catch (error) {
        console.error('Error fetching operator list:', error);
        throw error;
    } finally {
        await con.end();
    }
}

async function OperatorPassCheck_chernigiv(login, password) {
    const con = await mysql.createConnection(config.get('MySQL.R145j7_aqua_crm'));
    try {
        const [rows] = await con.execute(`
            SELECT password 
            FROM users 
            WHERE login = ?
        `, [login]);

        if (rows.length === 0) {
            return { success: false, message: 'Такого логіну не існує!' };
        }

        const storedPassword = rows[0].password;
        const isMatch = password === storedPassword;

        if (isMatch) {
            const token = crypto.randomBytes(16).toString('hex');

            await con.execute(`
                UPDATE users 
                SET token = ? 
                WHERE login = ?
            `, [token, login]);

            return { success: true, token: token };
        } else {
            return { success: false, message: 'Пароль хибний!' };
        }
    } catch (error) {
        console.error('Error checking password:', error);
        logger_database.error('Error checking password:', error);
        return { success: false, message: 'Помилка сервера!' };
    } finally {
        await con.end();
    }
}

async function OperatorRouteDate_chernigiv(criteria) {
    try {
        // Подключение к первой базе данных для получения имени пользователя
        const con1 = await mysql.createConnection(config.get('MySQL.R145j7_aqua_crm'));
        const [rows1] = await con1.execute('SELECT name1 FROM users WHERE login = ?', [criteria.worker]);
        await con1.end();

        if (rows1.length === 0) {
            throw new Error('Worker not found');
        }

        const workerName = rows1[0].name1;

        // Подключение ко второй базе данных для получения информации о заданиях
        const con2 = await mysql.createConnection(config.get('MySQL.R145j7_aqua_crm_chernigiv'));

        // Первый запрос для получения уникальных дат
        const [datesRows] = await con2.execute(`
            SELECT DISTINCT CONVERT_TZ(work_date, '+00:00', @@session.time_zone) as work_date
            FROM tasks
            WHERE brigade = ? AND work_date IS NOT NULL
            ORDER BY work_date ASC`, 
            [workerName]);

        // Преобразуем даты в нужный формат
        const dates = datesRows.map(row => new Date(row.work_date).toISOString().split('T')[0]);

        // Определяем дату для выборки
        let selectedDate = criteria.date ? new Date(criteria.date).toISOString().split('T')[0] : null;

        if (!selectedDate && dates.length > 0) {
            selectedDate = dates[0];
        }

        if (!selectedDate) {
            await con2.end();
            return { success: false, NoData: true };
        }

        // Второй запрос для получения заявок по определенной дате
        const [rows2] = await con2.execute(`
            SELECT t.ID as task_id, t.address_id, t.tasks_type,
                   CONCAT(sb.type, " ", sb.name, ", буд. ", a.adr_building, 
                          IFNULL(CONCAT(", корп. ", a.adr_building2), ""), 
                          IFNULL(CONCAT(", кв. ", a.adr_fl_of), "")) AS address,
                   t.meters_id,
                   t.note
            FROM tasks t
            LEFT JOIN addresses a ON t.address_id = a.ID
            LEFT JOIN street_base sb ON a.adr_street_id = sb.ID
            WHERE t.brigade = ? AND DATE(CONVERT_TZ(t.work_date, '+00:00', @@session.time_zone)) = ?`, 
            [workerName, selectedDate]);

        const addresses = rows2.map(row => ({
            task_id: row.task_id,
            address_id: row.address_id,
            address: row.address,
            tasks_type: row.tasks_type,
            meter_count: row.meters_id ? row.meters_id.split('|').length : 0,
            note: row.note || ''
        }));

        await con2.end();

        return { success: true, current_date: selectedDate, dates, addresses };
    } catch (error) {
        console.error('Error in OperatorRouteDate_chernigiv:', error);
        return { success: false, message: error.message };
    }
}

async function OperatorAddressInfo_chernigiv(criteria) {
    const con = await mysql.createConnection(config.get('MySQL.R145j7_aqua_crm_chernigiv'));

    try {
        const taskId = criteria.task_id;
        const addressId = criteria.address_id;

        // Получаем данные адреса
        const [rows] = await con.execute(`
            SELECT 
                a.adr_street_id,
                CONCAT(sb.type, " ", sb.name, ", буд. ", a.adr_building, 
                       IFNULL(CONCAT(", корп. ", a.adr_building2), ""), 
                       IFNULL(CONCAT(", кв. ", a.adr_fl_of), "")) AS address,
                a.phone,
                a.fml
            FROM addresses a
            LEFT JOIN street_base sb ON a.adr_street_id = sb.ID
            WHERE a.ID = ?
        `, [addressId]);

        if (rows.length === 0) {
            return { success: false, message: 'Адрес не найден' };
        }

        const addressData = rows[0];

        // Получаем счетчики по адресу, включая типы счетчиков и год производства
        const [metersResult] = await con.execute(`
            SELECT m.ID, m.number, mb.name AS type_id, YEAR(m.prod_date) as prod_date
            FROM meters m
            LEFT JOIN meters_base mb ON m.type_id = mb.ID
            WHERE m.address_id = ?
            ORDER BY m.number ASC
        `, [addressId]);

        const meters = metersResult.map(meter => ({
            ID: meter.ID,
            number: meter.number,
            type: meter.type_id,
            prodDate: meter.prod_date
        }));

        // Получаем счетчики из заявки
        const [taskMetersResult] = await con.execute(`
            SELECT meters_id
            FROM tasks
            WHERE ID = ?
        `, [taskId]);

        let taskMeters = [];
        if (taskMetersResult.length > 0 && taskMetersResult[0].meters_id) {
            taskMeters = taskMetersResult[0].meters_id.split('|');
        }

        // Обновляем счетчики с учетом наличия в заявке
        const updatedMeters = meters.map(meter => {
            if (taskMeters.includes(meter.ID.toString())) {
                return { ...meter, task: 'enable' };
            } else {
                return { ...meter, task: 'disable' };
            }
        });

        // Формируем полный ответ
        const result = {
            address: addressData.address,
            phone: addressData.phone,
            fml: addressData.fml,
            meters: updatedMeters
        };

        return { success: true, address: result };
    } catch (error) {
        console.error('Error in OperatorAddressInfo_chernigiv:', error);
        logger_database.error('Error in OperatorAddressInfo_chernigiv:', error);
        return { success: false, message: 'Помилка сервера!' };
    } finally {
        await con.end();
    }
}

module.exports = {  OperatorList_chernigiv,
                    OperatorPassCheck_chernigiv,
                    OperatorRouteDate_chernigiv,
                    OperatorAddressInfo_chernigiv
                };