const https = require('https');
const WebSocket = require('ws');
const fs = require('fs');
const mysql = require('mysql2/promise');

const log4js = require("log4js");
const config = require('config');

log4js.configure(config.get('log4js'));
const logger_websocket = log4js.getLogger("CRM WebSoket");

const serverAddresses = require('./server_scripts/server_addresses');
const serverMeters = require('./server_scripts/server_meters');
const serverTasks = require('./server_scripts/server_tasks');
const serverRoute = require('./server_scripts/server_route');
const serverReports = require('./server_scripts/server_reports');
const serverOperator = require('./server_scripts/server_operator');
const serverSettings = require('./server_scripts/server_settings');

const INACTIVITY_TIMEOUT = 10 * 60 * 1000;
let connectionCount = 0;
const activeConnections = [];
const connectedUsers = {};
const removalTimers = {};
const inactivityTimers = {};
const handlers = {
    "sumy": {
        "adresses": {
            "adresses": async () => ({ action: "adressesResponse", data: await serverAddresses.AllAdresses_sumy() }),
            "streets": async () => ({ action: "streetsResponse", data: await serverAddresses.AllStreets_sumy() })
        },
        "meters": {
            "meters": async () => ({ action: "metersResponse", data: await serverMeters.AllMeters() }),
            "addresses": async () => ({ action: "addressesResponse", data: await serverMeters.FetchMeterAddresses_chernigiv() })
        }
    },
    "chernigiv": {
        "addresses": {
            "addresses": async () => {
                const result = await serverAddresses.AllAdresses_chernigiv();
                return {
                    action: "addressesResponse",
                    data: result.data,
                    totalRecords: result.totalRecords,
                    filteredRecords: result.filteredRecords,
                    displayedRecords: result.displayedRecords
                };
            },
            "streets": async () => ({ action: "addressesStreetsResponse", data: await serverAddresses.AllStreets_chernigiv() }),
            "search": async (searchData) => { return { action: "addressesSearchResponse", data: await serverAddresses.SearchAddresses_chernigiv(searchData) }},
            "object": async (DataId) => { return { action: "addressesObjectResponse", data: await serverAddresses.ObjectAddresses_chernigiv(DataId) }},
            "filter": async (criteria, list) => {
                const result = await serverAddresses.FilterAddresses_chernigiv(criteria, list);
                return {
                    action: "addressesFilterResponse",
                    field: list,
                    values: result.data,
                    totalRecords: result.totalRecords,
                    filteredRecords: result.filteredRecords,
                    displayedRecords: result.displayedRecords
                };
            },
            "meters": async (criteria) => { return { action: "addressesMetersArrResponse", data: await serverAddresses.MetersArrAddresses_chernigiv(criteria) }},
        },
        "meters": {
            "meters": async () => {
                const result = await serverMeters.AllMeters_chernigiv();
                return {
                    action: "metersResponse",
                    data: result.data,
                    totalRecords: result.totalRecords,
                    filteredRecords: result.filteredRecords,
                    displayedRecords: result.displayedRecords
                };
            },
            "meter_types": async () => ({ action: "metersMeterTypesResponse", data: await serverMeters.FetchMeterTypes_chernigiv() }),
            "search": async (searchData) => { return { action: "metersSearchResponse", data: await serverMeters.SearchMeters_chernigiv(searchData) }},
            "object": async (DataId) => { return { action: "metersObjectResponse", data: await serverMeters.ObjectMeters_chernigiv(DataId) }},
            "filter": async (criteria, list) => {
                const result = await serverMeters.FilterMeters_chernigiv(criteria, list);
                return {
                    action: "metersFilterResponse",
                    field: list,
                    values: result.data,
                    totalRecords: result.totalRecords,
                    filteredRecords: result.filteredRecords,
                    displayedRecords: result.displayedRecords
                };
            },
            "addresses": async (criteria) => ({ 
                action: "metersAddressesResponse", 
                data: await serverMeters.FetchMeterAddresses_chernigiv(criteria) 
            }),
            "addresses_edit": async (criteria) => ({ 
                action: "metersAddressesEditResponse", 
                data: await serverMeters.FetchMeterAddresses_chernigiv(criteria) 
            }),
        },
        "tasks": {
            "tasks": async () => {
                const result = await serverTasks.AllTasks_chernigiv();
                return {
                    action: "tasksResponse",
                    data: result.data,
                    totalRecords: result.totalRecords,
                    filteredRecords: result.filteredRecords,
                    displayedRecords: result.displayedRecords
                };
            },
            "searchAddresses": async (searchData) => { return { action: "tasksSearchAddressesResponse", data: await serverTasks.AddressesSearchTasks_chernigiv(searchData) }},
            "searchMeters": async (searchData) => { return { action: "tasksSearchMetersResponse", data: await serverTasks.MetersSearchTasks_chernigiv(searchData) }},
            "object": async (DataId) => { return { action: "tasksArchiveObjectResponse", data: await serverTasks.ObjectTasks_chernigiv(DataId, "archive") }},
            "filter": async (criteria, list) => {
                const result = await serverTasks.FilterTasks_chernigiv(criteria, list);
                return {
                    action: "tasksFilterResponse",
                    field: list,
                    values: result.data,
                    totalRecords: result.totalRecords,
                    filteredRecords: result.filteredRecords,
                    displayedRecords: result.displayedRecords
                };
            },
        },
        "route": {
            "route": async (criteria) => {
                return await serverRoute.Route_chernigiv(criteria);
            },
            "object": async (DataId) => { return { action: "tasksObjectResponse", data: await serverTasks.ObjectTasks_chernigiv(DataId, "valid") }},
            "addresses": async (criteria) => ({ 
                action: "tasksAddressesResponse", 
                data: await serverRoute.FetchTasksAddresses_chernigiv(criteria) 
            }),
            "meters": async (criteria) => { return { action: "tasksMetersArrResponse", data: await serverAddresses.MetersArrAddresses_chernigiv(criteria) }},
            "filter": async (criteria, list) => {
                return await serverRoute.FilterRoute_chernigiv(criteria, list);
            },
            "change": async (criteria) => {
                return await serverRoute.RouteChange_chernigiv(criteria);
            },
            "print": async (criteria) => {
                return await serverRoute.RoutePrint_chernigiv(criteria);
            },
            "excel": async (criteria) => {
                return await serverRoute.RouteExcel_chernigiv(criteria);
            }
        },
        "reports": {
            "calendar": async (criteria) => {
                return await serverReports.getCalendarDates_chernigiv(criteria);
            },
            "generate": async (criteria, ws) => {
                await serverReports.GenerateReportCSV_chernigiv(criteria, ws);
            },
        },
        "settings": {
            "connected_users": async () => {
                const usersStatus = await serverSettings.UsersStatus(connectedUsers);
                return {
                    action: "connected_usersResponse",
                    data: usersStatus
                };
            },
            "blocked_ips": async () => {
                const BlockedIPs = await serverSettings.BlockedIPs();
                return {
                    action: "blocked_ipsResponse",
                    data: BlockedIPs
                };
            }
        },
        "operator": {
            "operator_list": async () => {
                return await serverOperator.OperatorList_chernigiv();
            },
            "pass_check": async (Login, PassWord) => {
                return await serverOperator.OperatorPassCheck_chernigiv(Login, PassWord);
            },
            "route_date": async (criteria) => {
                return await serverOperator.OperatorRouteDate_chernigiv(criteria);
            },
            "address_info": async (criteria) => {
                return await serverOperator.OperatorAddressInfo_chernigiv(criteria);
            }
        }
    }
}

const credentials = {
  key: fs.readFileSync('/home/R145j7/conf/web/crm.aquaprylad.in.ua/ssl/crm.aquaprylad.in.ua.key'),
  cert: fs.readFileSync('/home/R145j7/conf/web/crm.aquaprylad.in.ua/ssl/crm.aquaprylad.in.ua.crt')
};

const server = https.createServer(credentials, (req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('WebSocket server is running.\n');
});

const wss = new WebSocket.Server({ server });

wss.on('connection', async (ws, req) => {
    // const ip = req.socket.remoteAddress;
    // console.log(`Attempting connection from IP: ${ip}`);

    let token = req.url.split('?')[1].split('&')[0].split('=')[1];
    let page = req.url.split('?')[1].split('&')[1].split('=')[1];
    const { login, login_name } = await getLoginByToken(token);
    // console.log(`Token: ${token} Page: ${page} Login: ${login} Login_name: ${login_name}`);

    if (login === null && token !== 'getusers' && token !== 'user_auth') {
        if(page === '[OPERATOR]') {
            ws.send(JSON.stringify({token: false}));
        }
        logger_websocket.error(`Connection attempt with invalid or missing token: ${token}`);
        ws.close(4001, 'Invalid or missing token');
        return;
    }

    const currentConnectionNumber = ++connectionCount;
    ws.connectionNumber = currentConnectionNumber;
    // if(page != '[CHERNIGIV-REPORTS]' && login != 'kovaladmin' && token != 'getusers' && token != 'user_auth') {
    if(login != 'kovaladmin') {
        // logger_websocket.info(`NEW CONNECTION! №: [${currentConnectionNumber}] ${page} Name: [${login_name}]`);
        activeConnections.push(ws);
        manageUserConnection('add', currentConnectionNumber, login, login_name, page);
    }

    resetInactivityTimer(ws);

    ws.on('message', async (message) => {
        resetInactivityTimer(ws);
        try {
            const request = JSON.parse(message);
            // console.log('Received message from client:', request);
            if (page === '[OPERATOR]') {
                console.log('Received message from client:', request);
            }
            const action = handlers[request.action] && handlers[request.action][request.parameters.page];
            if (typeof action === 'function') {
                const response = await action();
                ws.send(JSON.stringify(response));
            } else if (typeof action === 'object' && action[request.parameters.table]) {
                const params = [];
                if (request.parameters.criteria) params.push(request.parameters.criteria);
                if (request.parameters.list) params.push(request.parameters.list);
                if (request.parameters.searchData) params.push(request.parameters.searchData);
                if (request.parameters.DataId) params.push(request.parameters.DataId);
                if (request.parameters.Login) params.push(request.parameters.Login);
                if (request.parameters.PassWord) params.push(request.parameters.PassWord);
    
                if (request.parameters.table === 'generate') {
                    await action[request.parameters.table](...params, ws);
                } else {
                    const response = await action[request.parameters.table](...params);
                    ws.send(JSON.stringify(response));
                }
            }
        } catch (error) {
            logger_websocket.error('Error handling request message: ', error);
        }
    });

    ws.on('close', (code, reason) => {
        clearTimeout(inactivityTimers[ws.connectionNumber]);
        delete inactivityTimers[ws.connectionNumber];
        // if(page != '[CHERNIGIV-REPORTS]' && login != 'kovaladmin' && token != 'getusers' && token != 'user_auth') {
        if(login != 'kovaladmin') {
            const codeDescription = getCloseCodeDescription(code);
            // logger_websocket.info(`CONNECTION CLOSED! №: [${ws.connectionNumber}] ${page} Name: [${login_name}] ||| Code: ${code} - ${codeDescription} | Reason: ${reason}`);
            const index = activeConnections.indexOf(ws);
            if (index !== -1) {
                activeConnections.splice(index, 1);
            }
            const CloseReason = `||| Code: ${code} - ${codeDescription} | Reason: ${reason}`;
            manageUserConnection('dell', currentConnectionNumber, login, login_name, page, CloseReason);
        }
    });
});

function resetInactivityTimer(ws) {
    if (inactivityTimers[ws.connectionNumber]) {
        clearTimeout(inactivityTimers[ws.connectionNumber]);
    }
    inactivityTimers[ws.connectionNumber] = setTimeout(() => {
        ws.close(4000, 'Server timeout.');
    }, INACTIVITY_TIMEOUT);
}

async function getLoginByToken(token) {
    const connection = await mysql.createConnection(config.get('MySQL.R145j7_aqua_crm'));
    try {
        const query = `SELECT login, name1, name2 FROM users WHERE token = ?`;
        const [rows] = await connection.execute(query, [token]);
        
        if (rows.length > 0) {
            const login = rows[0].login;
            const name1 = rows[0].name1;
            const name2 = rows[0].name2 !== null ? rows[0].name2 : '';
            const login_name = name1 + (name2 ? ` ${name2}` : '');

            return {
                login: login,
                login_name: login_name
            };
        } else {
            return {
                login: null,
                login_name: null
            };
        }
    } catch (error) {
        logger_websocket.error(`Error while fetching login by token: `, error);
        return null;
    } finally {
        await connection.end();
    }
}

function getCloseCodeDescription(code) {
    switch (code) {
        case 1000:
            return  "Normal Closure => "+
                    "З'єднання успішно закрито.";
        case 1001:
            return  "Going Away => "+
                    "Кінцева точка закривається, або через збій сервера, або через те, що браузер переходить від сторінки, яка відкрила з'єднання.";
        case 1002:
            return  "Protocol Error => "+
                    "Сервер завершує з'єднання через неочікувані умови, які завадили виконанню запиту.";
        case 1003:
            return  "Unsupported Data => "+
                    "Сервер завершує з'єднання через отримані дані у форматі, який він не розуміє.";
        case 1005:
            return  "No Status Code => "+
                    "Зарезервовано. Вказує на те, що код статусу не був наданий, хоча його очікували.";
        case 1006:
            return  "Abnormal Closure => "+
                    "Зарезервовано. Використовується для позначення того, що з'єднання було аварійно закрито, наприклад, "+
                    "без відправлення або отримання керуючого кадру закриття.";
        case 1007:
            return  "Invalid frame payload data => "+
                    "Сервер завершує з'єднання через отримані повідомлення, які містять неузгоджені бінарні дані.";
        case 1008:
            return  "Policy Violation => "+
                    "З'єднання завершується через порушення політики.";
        case 1009:
            return  "Message Too Big => "+
                    "Сервер завершує з'єднання через отримані повідомлення, які перевищують визначені обмеження.";
        case 1010:
            return  "Mandatory Extension => "+
                    "Клієнт завершує з'єднання, оскільки сервер не узгодив одне чи декілька розширень під час зʼєднання WebSocket.";
        case 1011:
            return  "Internal Error => "+
                    "Сервер завершує з'єднання через неочікувані умови, які завадили виконанню запиту.";
        case 1012:
            return  "Service Restart => "+
                    "Зарезервовано. Вказує на те, що служба буде перезапущена.";
        case 1013:
            return  "Try Again Later => "+
                    "Сервер завершує з'єднання через тимчасову умову, наприклад, через перевантаження сервера, який відкидає деяких клієнтів.";
        case 1014:
            return  "Bad Gateway => "+
                    "Сервер діє як шлюз або проксі, і він отримав неправильну відповідь від вихідного сервера.";
        case 1015:
            return  "TLS Handshake => "+
                    "Зарезервовано. Вказує на те, що з'єднання було закрито через невдачу виконати TLSзʼєднання.";
        case 4000:
            return  "Server timeout => "+
                    "Сервер завершив зїєднання через неактивність користувача.";
        case 4001:
            return  "Invalid or missing token => "+
                    "Сервер завершив зїєднання. Токен не вірний або відсутній у базі даних.";
        case 4004:
            return  "Operator Android closure => "+
                    "Завершення зʼєднання на стороні користувача. Оператор Android завершив зʼєднання.";
      default:
          return "Unknown Code: " + code;
    }
}

function manageUserConnection(action, connectionNumber, login, loginName, page, CloseReason = null) {
    const currentTime = new Date();
    if (action === 'add') {
        if (!connectedUsers[login]) {
            connectedUsers[login] = {
                loginName: loginName,
                connectionTime: currentTime,
                pages: []
            };
            logger_websocket.info(`NEW CONNECTION! ${page} User [${loginName}].`);
        }

        connectedUsers[login].pages.push({
            connectionNumber: connectionNumber,
            page: page,
            pageTime: currentTime
        });

        if (removalTimers[login]) {
            clearTimeout(removalTimers[login]);
            delete removalTimers[login];
        }
    } else if (action === 'dell') {
        const user = connectedUsers[login];
        if (user) {
            const pageIndex = user.pages.findIndex(p => p.connectionNumber === connectionNumber);
            if (pageIndex !== -1) {
                if (user.pages[pageIndex].page !== page) {
                    logger_websocket.error(`Mismatch in page data for user [${loginName}] with login [${login}] and connection [${connectionNumber}]. Provided page: [${page}], Recorded page: [${user.pages[pageIndex].page}]`);
                } else {
                    user.pages.splice(pageIndex, 1);

                    if (user.pages.length === 0) {
                        removalTimers[login] = setTimeout(() => {
                            const totalTime = (new Date() - user.connectionTime) / 1000;
                            const hours = Math.floor(totalTime / 3600);
                            const minutes = Math.floor((totalTime % 3600) / 60);
                            const seconds = Math.floor(totalTime % 60);
                            logger_websocket.info(`CONNECTION CLOSED! ${page} User [${loginName}]. Connection time: ${hours}h ${minutes}m ${seconds}s. ${CloseReason}`);
                            delete connectedUsers[login];
                        }, 60000);
                    }
                }
            }
        }
    }
}

const PORT = 8889;
server.listen(PORT, () => {
  logger_websocket.info(`WebSocket server listening on port ${PORT} (HTTPS)`);
});
