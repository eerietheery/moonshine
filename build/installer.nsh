; Custom NSIS include for Moonshine installer
; Adds option to preserve user data during uninstall

!macro customUnInstall
  ; Check if this is called during uninstall
  ${If} ${UninstallMode}
    ; Ask user about preserving data
    MessageBox MB_YESNO|MB_ICONQUESTION "Do you want to keep your playlists, favorites, and settings?$\r$\n$\r$\nYour data will be backed up to Documents\Moonshine Backup folder." /SD IDYES IDNO delete_data
    
    ; User wants to preserve data
    DetailPrint "Backing up user data..."
    
    ; Get paths
    ReadEnvStr $0 "APPDATA"
    StrCpy $1 "$0\moonshine"
    ReadEnvStr $2 "USERPROFILE"
    StrCpy $3 "$2\Documents\Moonshine Backup"
    
    ; Check if user data exists
    ${If} ${FileExists} "$1\config.json"
      ; Create backup directory
      CreateDirectory "$3"
      
      ; Copy all files from moonshine appdata to backup
      CopyFiles /SILENT "$1\*.*" "$3\"
      
      ; Create restoration instructions
      FileOpen $4 "$3\HOW_TO_RESTORE.txt" w
      FileWrite $4 "Moonshine User Data Backup$\r$\n"
      FileWrite $4 "=========================$\r$\n"
      FileWrite $4 "Created: ${__DATE__} ${__TIME__}$\r$\n"
      FileWrite $4 "$\r$\n"
      FileWrite $4 "This folder contains your backed up playlists, favorites, and settings.$\r$\n"
      FileWrite $4 "$\r$\n"
      FileWrite $4 "To restore after reinstalling Moonshine:$\r$\n"
      FileWrite $4 "1. Install Moonshine$\r$\n"
      FileWrite $4 "2. Open Settings > Data Backup & Restore$\r$\n"
      FileWrite $4 "3. Click 'Import User Data' and select 'config.json' from this folder$\r$\n"
      FileWrite $4 "$\r$\n"
      FileWrite $4 "Alternatively:$\r$\n"
      FileWrite $4 "- Enable 'Automatic Backup' in settings for future protection$\r$\n"
      FileWrite $4 "- The app will detect this backup automatically on first run$\r$\n"
      FileClose $4
      
      ; Show success message
      MessageBox MB_OK|MB_ICONINFORMATION "Your data has been backed up to:$\r$\n$3$\r$\n$\r$\nYou can restore it after reinstalling Moonshine using the Import feature in Settings."
      
      ; Open backup folder
      ExecShell "open" "$3"
      
      Goto cleanup_appdata
    ${Else}
      DetailPrint "No user data found to back up"
      Goto cleanup_appdata
    ${EndIf}
    
    delete_data:
    DetailPrint "User chose to delete all data"
    
    cleanup_appdata:
    ; Always clean up the original AppData folder since we either backed it up or user chose to delete
    ${If} ${FileExists} "$1\*.*"
      RMDir /r "$1"
    ${EndIf}
  ${EndIf}
!macroend