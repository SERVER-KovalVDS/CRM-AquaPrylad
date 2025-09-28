<?php
    try {
        $checkStmt = $conn->prepare("SELECT COUNT(*) FROM meters WHERE number = ? AND type_id = ? AND prod_date = ?");
        $checkStmt->bind_param("sii", $data['number'], $data['meterId'], $data['prodDate']);
        $checkStmt->execute();
        $checkStmt->bind_result($count);
        $checkStmt->fetch();
        $checkStmt->close();
        if ($count > 0) {
            $response = ['status' => 'warning', 'message' => 'Такий лічильник вже існує<br>в Базі Даних м. Чернігів.'];
        } else {
            $currentDateTime = date("d.m.Y H:i");
            $processType = 'Створення лічильника';
            $message = 'Лічильник додано до Бази Даних м. Чернігів.';
            $history = updateHistory($currentDateTime, $processType, $username, $message);
            $stmt = $conn->prepare("INSERT INTO meters (number, type_id, prod_date, service_type, value, location, balanser, address_id, history) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
            $stmt->bind_param("siissssis", $data['number'], $data['meterId'], $data['prodDate'], $data['serviceType'], $data['value'], $data['meter_location'], $data['balanser'], $data['meter_addressId'], $history);
            if ($stmt->execute()) {
                $response = ['status' => 'success', 'message' => 'Новий лічильник успішно додано<br>до Бази Даних Чернігів.', 'user' => $username, 'newMeterid' => $stmt->insert_id];
                
                if ($data['meter_addressId'] !== null) {
                    $meterNumber = $data['number'];
                    $addressStmt = $conn->prepare("SELECT history FROM addresses WHERE ID = ?");
                    $addressStmt->bind_param("i", $data['meter_addressId']);
                    $addressStmt->execute();
                    $addressStmt->bind_result($addressHistory);
                    $addressStmt->fetch();
                    $addressStmt->close();

                    $addressMessage = "Були додані лічильники $meterNumber.";
                    $updatedAddressHistory = updateHistory($currentDateTime, 'Додавання лічильника', $username, $addressMessage, $addressHistory);

                    $updateAddressStmt = $conn->prepare("UPDATE addresses SET history = ? WHERE ID = ?");
                    $updateAddressStmt->bind_param("si", $updatedAddressHistory, $data['meter_addressId']);
                    $updateAddressStmt->execute();
                    $updateAddressStmt->close();
                }
            } else {
                throw new Exception('Помилка при додаванні Нового лічильника до Бази Даних Чернігів.');
            }
        }
    } catch (mysqli_sql_exception $e) {
        $response = ['status' => 'error', 'message' => 'Помилка при додаванні Нового лічильника<br>до Бази Даних Чернігів: ' . $e->getMessage()];
        logger('database', 'NewDATA', '[ERROR]', 'Помилка при додаванні Нового лічильника до Бази Даних Чернігів: ' . $e->getMessage());
    } finally {
        if (isset($stmt)) {
            $stmt->close();
        }
        if (isset($conn)) {
            $conn->close();
        }
    }
?>