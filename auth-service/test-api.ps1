# Test API Script for Auth Service

Write-Host "Testing Auth Service API..." -ForegroundColor Cyan

# Test the simple test endpoint
Write-Host "`nTesting /api/auth/test endpoint..." -ForegroundColor Yellow
try {
    $testResponse = Invoke-RestMethod -Uri "http://localhost:4001/api/auth/test" -Method Get
    Write-Host "Response: " -NoNewline
    $testResponse | ConvertTo-Json
} catch {
    Write-Host "Error: $_" -ForegroundColor Red
    Write-Host "Status Code: $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Red
}

# Test the registration endpoint
Write-Host "`nTesting /api/auth/register endpoint..." -ForegroundColor Yellow
$registerBody = @{
    name = "Test User"
    email = "test@example.com"
    password = "password123"
} | ConvertTo-Json

try {
    $registerResponse = Invoke-RestMethod -Uri "http://localhost:4001/api/auth/register" -Method Post -Body $registerBody -ContentType "application/json"
    Write-Host "Response: " -NoNewline
    $registerResponse | ConvertTo-Json
    
    # Save the token for further requests
    $token = $registerResponse.token
    Write-Host "Token: $token" -ForegroundColor Green
} catch {
    Write-Host "Error: $_" -ForegroundColor Red
    Write-Host "Status Code: $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Red
    
    # Try to get the response content for more details
    try {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $reader.BaseStream.Position = 0
        $reader.DiscardBufferedData()
        $responseBody = $reader.ReadToEnd()
        Write-Host "Response Body: $responseBody" -ForegroundColor Red
    } catch {
        Write-Host "Could not read response body" -ForegroundColor Red
    }
}

# Test the login endpoint
Write-Host "`nTesting /api/auth/login endpoint..." -ForegroundColor Yellow
$loginBody = @{
    email = "test@example.com"
    password = "password123"
} | ConvertTo-Json

try {
    $loginResponse = Invoke-RestMethod -Uri "http://localhost:4001/api/auth/login" -Method Post -Body $loginBody -ContentType "application/json"
    Write-Host "Response: " -NoNewline
    $loginResponse | ConvertTo-Json
    
    # Save the token for further requests
    $token = $loginResponse.token
    Write-Host "Token: $token" -ForegroundColor Green
} catch {
    Write-Host "Error: $_" -ForegroundColor Red
    Write-Host "Status Code: $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Red
}

# Test the Swagger UI
Write-Host "`nTesting Swagger UI availability..." -ForegroundColor Yellow
try {
    $swaggerResponse = Invoke-WebRequest -Uri "http://localhost:4001/swagger-ui.html" -Method Get
    Write-Host "Swagger UI is available. Status: $($swaggerResponse.StatusCode)" -ForegroundColor Green
} catch {
    Write-Host "Error accessing Swagger UI: $_" -ForegroundColor Red
    Write-Host "Status Code: $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Red
}

Write-Host "`nAPI Testing Complete" -ForegroundColor Cyan 