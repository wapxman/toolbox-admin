' Запускает админку Taketool в продакшен-режиме СКРЫТО (без окна консоли).
' Продакшен (next start) стабилен — в отличие от next dev, у которого падали воркеры.
CreateObject("WScript.Shell").Run "cmd /c ""C:\Users\User\Desktop\GitHub\toolbox-admin\run_admin_prod.cmd""", 0, False
