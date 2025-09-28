<?php
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);
    $newToken = $data['token'];

    // Обновление токена в token.php
    $phpFile = 'token.php';
    $phpContent = file_get_contents($phpFile);
    $updatedPhpContent = preg_replace(
        '/<div id="token_for_cleaning_cash" style="display: none;">.*<\/div>/',
        '<div id="token_for_cleaning_cash" style="display: none;">' . $newToken . '</div>',
        $phpContent
    );
    file_put_contents($phpFile, $updatedPhpContent);

    // Обновление токена в token.js
    $jsFile = 'token.js';
    $jsContent = file_get_contents($jsFile);
    $updatedJsContent = preg_replace(
        '/var CashCleaningToken = ".*";/',
        'var CashCleaningToken = "' . $newToken . '";',
        $jsContent
    );
    file_put_contents($jsFile, $updatedJsContent);

    echo json_encode(['success' => true]);
}
?>