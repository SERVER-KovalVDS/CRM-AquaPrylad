<?php
    try {
        $checkStmt = $conn->prepare(
            "SELECT adr_street_id, adr_building, adr_building2, adr_fl_of 
                FROM addresses 
                WHERE adr_street_id = ? AND adr_building = ? AND adr_fl_of = ?"
        );
        $checkStmt->bind_param("sss", $data['adrStreetId'], $data['adrBuilding'], $data['adrFlOf']);
        $checkStmt->execute();
        $result = $checkStmt->get_result();
        $addressExists = false;
        while ($row = $result->fetch_assoc()) {
            if (($row['adr_building2'] === $data['adrBuilding2']) || 
                ($row['adr_building2'] === null && $data['adrBuilding2'] === null)) {
                $addressExists = true;
                break;
            }
        }
        $checkStmt->close();
        if ($addressExists) {
            $response = ['status' => 'warning', 'message' => 'Така адреса вже існує<br>в Базі Даних м. Чернігів.'];
        } else {
            $currentDateTime = date("d.m.Y H:i");
            $processType = 'Створення адреси';
            $message = 'Адресу додано до Бази Даних м. Чернігів.';
            $history = updateHistory($currentDateTime, $processType, $username, $message);
            $stmt = $conn->prepare("INSERT INTO addresses (adr_street_id, adr_building, adr_building2, adr_fl_of, fml, phone, history) VALUES (?, ?, ?, ?, ?, ?, ?)");
            $stmt->bind_param("sssssss", $data['adrStreetId'], $data['adrBuilding'], $data['adrBuilding2'], $data['adrFlOf'], $data['FMLvalue'], $data['phone'], $history);
            if ($stmt->execute()) {
                $response = ['status' => 'success', 'message' => 'Нова адреса успішно додана<br>до Бази Даних Чернігів.', 'user' => $username, 'newADRid' => $stmt->insert_id];
            } else {
                throw new Exception('Помилка при додаванні Нової адреси до Бази Даних Чернігів.');
            }
            $stmt->close();
        }
    } catch (mysqli_sql_exception $e) {
        $response = ['status' => 'error', 'message' => 'Помилка при додаванні Нової адреси<br>до Бази Даних Чернігів: ' . $e->getMessage()];
        logger('database', 'NewDATA', '[ERROR]', 'Помилка при додаванні Нової адреси до Бази Даних Чернігів: ' . $e->getMessage());
    } finally {
        if (isset($conn)) {
            $conn->close();
        }
    }
?>