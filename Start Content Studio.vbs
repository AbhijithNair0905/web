Set shell = CreateObject("WScript.Shell")
Set filesystem = CreateObject("Scripting.FileSystemObject")
projectPath = filesystem.GetParentFolderName(WScript.ScriptFullName)
shell.CurrentDirectory = projectPath
shell.Run "node scripts\editor-server.mjs", 0, False
WScript.Sleep 1200
shell.Run "http://127.0.0.1:3000/content-editor.html", 1, False
