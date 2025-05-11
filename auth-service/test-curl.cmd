@echo off
echo Testing Auth Service API...

echo.
echo Testing /api/auth/test endpoint...
curl -X GET http://localhost:4001/api/auth/test

echo.
echo.
echo Testing /api/auth/register endpoint...
curl -X POST -H "Content-Type: application/json" -d "{\"name\":\"Test User\",\"email\":\"test@example.com\",\"password\":\"password123\"}" http://localhost:4001/api/auth/register

echo.
echo.
echo Testing /api/auth/login endpoint...
curl -X POST -H "Content-Type: application/json" -d "{\"email\":\"test@example.com\",\"password\":\"password123\"}" http://localhost:4001/api/auth/login

echo.
echo.
echo Testing Swagger UI availability...
curl -I http://localhost:4001/swagger-ui.html

echo.
echo API Testing Complete
pause 