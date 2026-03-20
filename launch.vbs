Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

' Get the directory where this .vbs file lives
scriptDir = fso.GetParentFolderName(WScript.ScriptFullName)

' ── Step 1: Build if dist-electron/main.js does not exist ────────────────────
mainJs = scriptDir & "\dist-electron\main.js"
indexHtml = scriptDir & "\dist\index.html"

If Not fso.FileExists(mainJs) Or Not fso.FileExists(indexHtml) Then
    MsgBox "RecallAI: First launch detected. Building the app now..." & Chr(13) & "A build window will open briefly. Please wait for it to close.", 64, "RecallAI"
    ' Run npm run build (wait for it to finish)
    exitCode = WshShell.Run("cmd /c cd /d """ & scriptDir & """ && npm run build 2>&1", 1, True)
    If exitCode <> 0 Then
        MsgBox "Build failed! Please open a terminal in the project folder and run: npm run build", 16, "RecallAI - Build Error"
        WScript.Quit
    End If
End If

' ── Step 2: Launch the compiled Electron app (hidden console) ────────────────
WshShell.Run "cmd /c cd /d """ & scriptDir & """ && npm run run-prod", 0, False
