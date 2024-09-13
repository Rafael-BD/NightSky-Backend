$servicesPath = "./app-services"

$denoCommand = "deno run dev"

Set-Location -Path $servicesPath

Start-Process -NoNewWindow -FilePath "cmd.exe" -ArgumentList "/c $denoCommand"