@echo off
echo ========================================
echo FRESH START MIGRATION - Development
echo ========================================
echo.
echo WARNING: This will DELETE all family-related data!
echo Only continue if you have a backup or don't care about the dummy data.
echo.
set /p CONTINUE="Do you want to continue? (yes/no): "

if /i not "%CONTINUE%"=="yes" (
    echo Aborted.
    exit /b 1
)

echo.
echo Step 1/5: Backing up database...
pg_dump -h localhost -U postgres -d postgres > backup_before_fresh_start.sql
if errorlevel 1 (
    echo [ERROR] Backup failed! Make sure pg_dump is in PATH and database is running.
    pause
    exit /b 1
)
echo [OK] Backup created: backup_before_fresh_start.sql
echo.

echo Step 2/5: Applying fresh start SQL...
psql -h localhost -U postgres -d postgres -f migrations\fresh_start_development.sql
if errorlevel 1 (
    echo [ERROR] SQL migration failed!
    pause
    exit /b 1
)
echo [OK] Database schema updated
echo.

echo Step 3/5: Updating Prisma schema...
copy prisma\schema-fresh.prisma prisma\schema.prisma >nul
if errorlevel 1 (
    echo [ERROR] Failed to copy schema file!
    pause
    exit /b 1
)
echo [OK] Schema file updated
echo.

echo Step 4/5: Generating Prisma client...
call npx prisma generate
if errorlevel 1 (
    echo [ERROR] Prisma generate failed!
    pause
    exit /b 1
)
echo [OK] Prisma client generated
echo.

echo Step 5/5: Validating schema...
call npx prisma validate
if errorlevel 1 (
    echo [ERROR] Schema validation failed!
    pause
    exit /b 1
)
echo [OK] Schema validated
echo.

echo ========================================
echo MIGRATION COMPLETE!
echo ========================================
echo.
echo Next steps:
echo   1. Start dev server: npm run dev
echo   2. Test the application
echo   3. Update your forms to use split name fields
echo.
pause
