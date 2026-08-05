@echo off
cd /d "C:\Users\User\Desktop\GitHub\toolbox-admin"
"C:\Program Files\nodejs\node.exe" "node_modules\next\dist\bin\next" start -p 3000 >> "C:\Users\User\Desktop\GitHub\toolbox-admin\admin_prod.log" 2>&1
