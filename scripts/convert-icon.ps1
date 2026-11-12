Add-Type -AssemblyName System.Drawing
$src = "C:\Users\dell\.gemini\antigravity\brain\fc2b9e13-f703-45e5-a67b-21f78ddaa195\taskflow_app_icon_1794466226818.jpg"
$bmp = [System.Drawing.Bitmap]::FromFile($src)
$bmp.Save("assets/icon.png", [System.Drawing.Imaging.ImageFormat]::Png)
$bmp.Save("assets/adaptive-icon.png", [System.Drawing.Imaging.ImageFormat]::Png)
$bmp.Save("assets/splash-icon.png", [System.Drawing.Imaging.ImageFormat]::Png)
$bmp.Save("public/icon.png", [System.Drawing.Imaging.ImageFormat]::Png)

$fav = New-Object System.Drawing.Bitmap($bmp, 64, 64)
$fav.Save("assets/favicon.png", [System.Drawing.Imaging.ImageFormat]::Png)
$fav.Save("public/favicon.png", [System.Drawing.Imaging.ImageFormat]::Png)
$fav.Dispose()
$bmp.Dispose()
Write-Host "All icons converted to PNG successfully!"
