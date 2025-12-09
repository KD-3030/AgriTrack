# WhatsApp Feature Test Script
# Run this with: .\test-whatsapp-api.ps1

Write-Host "`n🧪 Testing WhatsApp API Endpoints`n" -ForegroundColor Cyan

# Test 1: Status Check
Write-Host "Test 1: Checking WhatsApp Status..." -ForegroundColor Yellow
try {
    $status = Invoke-RestMethod -Uri "http://localhost:3001/api/whatsapp/status" -Method GET -ErrorAction Stop
    Write-Host "✅ Status Check Successful!" -ForegroundColor Green
    Write-Host "   Configured: $($status.configured)" -ForegroundColor White
    Write-Host "   Message: $($status.message)" -ForegroundColor White
} catch {
    Write-Host "❌ Status Check Failed: $_" -ForegroundColor Red
}

Write-Host "`n"

# Test 2: Test HELP Command
Write-Host "Test 2: Testing HELP command..." -ForegroundColor Yellow
try {
    $body = @{
        phone = "919876543210"
        message = "HELP"
    } | ConvertTo-Json
    
    $result = Invoke-RestMethod -Uri "http://localhost:3001/api/whatsapp/test" -Method POST -Body $body -ContentType "application/json" -ErrorAction Stop
    Write-Host "✅ HELP Command Test Successful!" -ForegroundColor Green
    Write-Host "   Result: $($result.message)" -ForegroundColor White
} catch {
    Write-Host "❌ HELP Command Test Failed: $_" -ForegroundColor Red
}

Write-Host "`n"

# Test 3: Test LIST Command
Write-Host "Test 3: Testing LIST command..." -ForegroundColor Yellow
try {
    $body = @{
        phone = "919876543210"
        message = "LIST"
    } | ConvertTo-Json
    
    $result = Invoke-RestMethod -Uri "http://localhost:3001/api/whatsapp/test" -Method POST -Body $body -ContentType "application/json" -ErrorAction Stop
    Write-Host "✅ LIST Command Test Successful!" -ForegroundColor Green
    Write-Host "   Result: $($result.message)" -ForegroundColor White
} catch {
    Write-Host "❌ LIST Command Test Failed: $_" -ForegroundColor Red
}

Write-Host "`n"

# Test 4: Test Booking
Write-Host "Test 4: Testing BOOKING command..." -ForegroundColor Yellow
try {
    $body = @{
        phone = "919876543210"
        message = "Book Tractor on 15-12-2025 for 5 acres at Test Farm"
    } | ConvertTo-Json
    
    $result = Invoke-RestMethod -Uri "http://localhost:3001/api/whatsapp/test" -Method POST -Body $body -ContentType "application/json" -ErrorAction Stop
    Write-Host "✅ BOOKING Command Test Successful!" -ForegroundColor Green
    Write-Host "   Result: $($result.message)" -ForegroundColor White
} catch {
    Write-Host "❌ BOOKING Command Test Failed: $_" -ForegroundColor Red
}

Write-Host "`n"
Write-Host "🎉 Testing Complete!" -ForegroundColor Cyan
Write-Host "`n📖 Next Steps:" -ForegroundColor Yellow
Write-Host "   1. All tests passed? ✅ WhatsApp feature is working!" -ForegroundColor White
Write-Host "   2. Want real WhatsApp? Add Green API credentials to .env" -ForegroundColor White
Write-Host "   3. See TESTING_WHATSAPP.md for full guide" -ForegroundColor White
Write-Host "`n"
