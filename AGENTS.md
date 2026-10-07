# Build delivery preference

- Always deliver the Windows executable at `dist/PathAnimator-1.0.0-portable.exe`.
- Reuse that exact directory and filename; do not create alternate release directories or EXE names for fixes.
- If a running app locks build files, explain the lock and ask the user to close the app rather than changing the output location.
