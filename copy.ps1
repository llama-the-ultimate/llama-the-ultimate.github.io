$urls = ConvertFrom-Json((Invoke-WebRequest "https://llama-the-ultimate.glitch.me/rpc/links?url=https%3A%2F%2Fllama-the-ultimate.org").Content);
foreach  ($url in $urls) {
  $path = ".$(([uri]$url).AbsolutePath)";
  Invoke-WebRequest $url -OutFile (New-Item -Type File -Path $path -Force);
}

foreach ($file in Get-ChildItem "./gd/notes/") {
    if (($urls -contains "https://llama-the-ultimate.glitch.me/gd/notes/$($file.Name)")) {
        Write-Host "notes/$($file.BaseName) should stay";
    } else {
        Write-Host "notes/$($file.BaseName) should go";
    }
}
