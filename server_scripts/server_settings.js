const mysql = require('mysql2/promise');
const config = require('config');

async function UsersStatus(connectedUsers) {
    const connection = await mysql.createConnection(config.get('MySQL.R145j7_aqua_crm'));
    try {
        const query = `SELECT login, name1, name2 FROM users`;
        const [rows] = await connection.execute(query);
        const allUsers = rows
            .filter(row => row.login !== 'kovaladmin')
            .map(row => {
                const login = row.login;
                const name1 = row.name1;
                const name2 = row.name2 !== null ? row.name2 : '';
                const fullName = name1 + (name2 ? ` ${name2}` : '');
                const user = connectedUsers[login];
                const status = user ? 'connected' : 'disconnected';
                const globalStartTime = user ? user.connectionTime : null;
                const pages = user ? user.pages.map(pageData => ({
                    page: pageData.page,
                    currentStartTime: pageData.pageTime
                })) : [];

                return {
                    login: login,
                    fullName: fullName,
                    status: status,
                    pages: pages,
                    globalStartTime: globalStartTime
                };
            });
        return allUsers;
    } catch (error) {
        logger_websocket.error(`Error while fetching users: `, error);
        return [];
    } finally {
        await connection.end();
    }
}

async function BlockedIPs() {
    // Подключаемся к БД с заблокированными IP
    const connection = await mysql.createConnection(config.get('MySQL.R145j7_bases'));
    try {
        // Выполняем запрос на получение всех данных из таблицы blocked_IPs
        const query = `SELECT * FROM blocked_IPs`;
        const [rows] = await connection.execute(query);

        // Возвращаем данные в том виде, в каком они есть
        return rows;
    } catch (error) {
        logger_websocket.error(`Error while fetching blocked IPs: `, error);
        return [];
    } finally {
        // Закрываем соединение с БД
        await connection.end();
    }
}

module.exports = { UsersStatus, BlockedIPs };