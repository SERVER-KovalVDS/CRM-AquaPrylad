<?php
    $title = "Логи";
    $styles = " <link rel='stylesheet' href='css/logs.css'>
                <script type='module' src='scripts/logs_common.js'></script>
  
            ";
    $page = 'LOGS';
    
    require "blocks/header.php";
    // =================================== ЗАГАЛЬНИЙ БЛОК ===================================
?>
    
    <div class="main_block">
        <div id="LogButtons" class="log-buttons">
            <div onclick="loadLog('CRM_WS', this)">CRM_WS</div>
            <div onclick="loadLog('database', this)">Database</div>
            <div onclick="loadLog('enter', this)">Enter</div>
            <div onclick="loadLog('reports', this)">Reports</div>
            <div onclick="loadLog('system', this)">System</div>
            <div onclick="loadLog('websocket', this)">WebSocket</div>
        </div>
        <div id="logContainer" class="log-container"></div>
    </div>
<?php
    switch ($current_city):
      // =================================== БЛОК для міста С У М И ===================================
      case 'SUMY': ?>

          <?php break;
      // =================================== БЛОК для міста Ч Е Р Н І Г І В ===================================
      case 'CHERNIGIV': ?>

          <?php break; 
    endswitch;
    
    require "blocks/footer.php";
?>