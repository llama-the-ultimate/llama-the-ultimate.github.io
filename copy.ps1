$stuff = ConvertFrom-Json((Invoke-WebRequest "https://llama-the-ultimate.glitch.me/stuff").Content);
foreach  ($file in $stuff.assets) {
    Invoke-WebRequest  "https://llama-the-ultimate.glitch.me/assets/$file" -OutFile (New-Item -Type File -Path "./assets/$file" -Force);
    }
foreach  ($note in $stuff.notes) {
    $noext = $note.file.substring(0, $note.file.length - 4);
    Invoke-WebRequest "https://llama-the-ultimate.glitch.me/notes/$noext.html" -OutFile (New-Item -Type File -Path "./notes/$noext.html" -Force);
    Invoke-WebRequest "https://llama-the-ultimate.glitch.me/gd/notes/$noext.txt" -OutFile (New-Item -Type File -Path "./gd/notes/$noext.txt" -Force);
}
foreach ($staticFile in $stuff.static) {
    Invoke-WebRequest "https://llama-the-ultimate.glitch.me/$staticFile" -OutFile (New-Item -Type File -Path "./$staticFile" -Force );
}

$stuffFiles = $stuff.notes | % { $_.file }

foreach ($file in Get-ChildItem "./gd/notes/") {
    if (!($stuffFiles -contains $file)) {
        $fname = $file.name;
        $noext = $fname.substring(0, $fname.length - 4);
        rm "./gd/notes/$noext.txt";
        if (Test-Path "./notes/$noext.html") {
            rm "./notes/$noext.html";
        }
    }
}

Invoke-WebRequest "https://llama-the-ultimate.glitch.me/index.html" -OutFile (New-Item -Type File -Path "./index.html" -Force);
Invoke-WebRequest "https://llama-the-ultimate.glitch.me/gd/index.txt" -OutFile (New-Item -Type File -Path "./gd/index.txt" -Force);
