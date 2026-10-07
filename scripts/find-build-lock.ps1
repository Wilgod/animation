Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
public class FileLockOwners {
 [StructLayout(LayoutKind.Sequential)] public struct UniqueProcess { public uint pid; public System.Runtime.InteropServices.ComTypes.FILETIME start; }
 [StructLayout(LayoutKind.Sequential, CharSet=CharSet.Unicode)] public struct ProcessInfo {
 public UniqueProcess process;
 [MarshalAs(UnmanagedType.ByValTStr, SizeConst=256)] public string appName;
 [MarshalAs(UnmanagedType.ByValTStr, SizeConst=64)] public string service;
 public uint type; public uint status; public uint session;
 [MarshalAs(UnmanagedType.Bool)] public bool restartable;
 }
 [DllImport("rstrtmgr.dll", CharSet=CharSet.Unicode)] static extern int RmStartSession(out uint handle, int flags, string key);
 [DllImport("rstrtmgr.dll", CharSet=CharSet.Unicode)] static extern int RmRegisterResources(uint handle, uint count, string[] files, uint apps, IntPtr appList, uint services, IntPtr serviceList);
 [DllImport("rstrtmgr.dll")] static extern int RmGetList(uint handle, out uint needed, ref uint count, [In, Out] ProcessInfo[] info, ref uint reasons);
 [DllImport("rstrtmgr.dll")] static extern int RmEndSession(uint handle);
 public static ProcessInfo[] Find(string file) {
 uint h; int err=RmStartSession(out h,0,Guid.NewGuid().ToString("N")); if(err!=0)throw new Exception("Start: "+err);
 try { err=RmRegisterResources(h,1,new[]{file},0,IntPtr.Zero,0,IntPtr.Zero); if(err!=0)throw new Exception("Register: "+err);
 uint needed=0,count=0,reasons=0; err=RmGetList(h,out needed,ref count,null,ref reasons); if(err==0)return new ProcessInfo[0]; if(err!=234)throw new Exception("List: "+err);
 var result=new ProcessInfo[needed]; count=needed; err=RmGetList(h,out needed,ref count,result,ref reasons); if(err!=0)throw new Exception("List: "+err); return result;
 } finally { RmEndSession(h); }
 }
}
'@
$target = Join-Path (Split-Path $PSScriptRoot) 'dist\win-unpacked\resources\app.asar'
[FileLockOwners]::Find($target) | ForEach-Object { [pscustomobject]@{Id=$_.process.pid;App=$_.appName;Service=$_.service} }
