#requires -Version 5.1
$ErrorActionPreference = 'Stop'

$Root = if ($PSScriptRoot) { $PSScriptRoot } else { Split-Path -Parent $MyInvocation.MyCommand.Path }

function Add-FlowStateIconBuilderType {
    $csharp = @'
using System;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Imaging;
using System.IO;

public static class FlowStateIconBuilder
{
    public static Bitmap LoadAndRecolor(string path, byte r, byte g, byte b)
    {
        using (var src = new Bitmap(path))
        using (var work = new Bitmap(src.Width, src.Height, PixelFormat.Format32bppArgb))
        {
            using (var gr = Graphics.FromImage(work))
            {
                gr.DrawImageUnscaled(src, 0, 0);
            }
            for (int y = 0; y < work.Height; y++)
            {
                for (int x = 0; x < work.Width; x++)
                {
                    Color c = work.GetPixel(x, y);
                    if (c.A != 0)
                        work.SetPixel(x, y, Color.FromArgb(c.A, r, g, b));
                }
            }
            return new Bitmap(work);
        }
    }

    public static Bitmap ResizeTo(Bitmap src, int size)
    {
        var dst = new Bitmap(size, size, PixelFormat.Format32bppArgb);
        using (var gr = Graphics.FromImage(dst))
        {
            gr.Clear(Color.Transparent);
            gr.InterpolationMode = InterpolationMode.HighQualityBicubic;
            gr.PixelOffsetMode = PixelOffsetMode.HighQuality;
            gr.SmoothingMode = SmoothingMode.HighQuality;
            gr.CompositingQuality = CompositingQuality.HighQuality;
            gr.DrawImage(src, new Rectangle(0, 0, size, size));
        }
        return dst;
    }

    public static byte[] BitmapToPngBytes(Bitmap bmp)
    {
        using (var ms = new MemoryStream())
        {
            bmp.Save(ms, ImageFormat.Png);
            return ms.ToArray();
        }
    }

    /* Multi-image ICO with embedded PNG payloads (Windows Vista+). */
    public static void WriteMultiSizeIco(string path, int[] dims, object[] pngChunks)
    {
        if (dims == null || pngChunks == null || dims.Length != pngChunks.Length || dims.Length == 0)
            throw new ArgumentException("dims and pngChunks must be same non-zero length.");

        using (var fs = new FileStream(path, FileMode.Create, FileAccess.Write))
        using (var bw = new BinaryWriter(fs))
        {
            int n = dims.Length;
            bw.Write((ushort)0);
            bw.Write((ushort)1);
            bw.Write((ushort)n);

            uint offset = 6 + (uint)(16 * n);
            for (int i = 0; i < n; i++)
            {
                int dim = dims[i];
                byte[] png = (byte[])pngChunks[i];
                byte w = dim >= 256 ? (byte)0 : (byte)dim;
                byte h = dim >= 256 ? (byte)0 : (byte)dim;
                bw.Write(w);
                bw.Write(h);
                bw.Write((byte)0);
                bw.Write((byte)0);
                bw.Write((ushort)1);
                bw.Write((ushort)32);
                bw.Write((uint)png.Length);
                bw.Write(offset);
                offset += (uint)png.Length;
            }
            for (int i = 0; i < n; i++)
                bw.Write((byte[])pngChunks[i]);
        }
    }
}
'@

    $ref = Join-Path ([Runtime.InteropServices.RuntimeEnvironment]::GetRuntimeDirectory()) 'System.Drawing.dll'
    if (-not (Test-Path -LiteralPath $ref)) {
        throw "System.Drawing.dll not found at: $ref"
    }

    Add-Type -TypeDefinition $csharp -ReferencedAssemblies $ref -ErrorAction Stop
}

Add-Type -AssemblyName System.Drawing
Add-FlowStateIconBuilderType

$pngFiles = @(Get-ChildItem -LiteralPath $Root -Filter '*.png' -File | Sort-Object Name)
if ($pngFiles.Count -eq 0) {
    throw "No .png files found in project root: $Root"
}

$pickPath = $null
foreach ($p in $pngFiles) {
    $img = [System.Drawing.Image]::FromFile($p.FullName)
    try {
        if ($img.Width -eq 96 -and $img.Height -eq 96) {
            $pickPath = $p.FullName
            break
        }
    }
    finally {
        $img.Dispose()
    }
}

if (-not $pickPath) {
    $bestPath = $null
    $bestArea = -1
    foreach ($p in $pngFiles) {
        $img = [System.Drawing.Image]::FromFile($p.FullName)
        try {
            $area = $img.Width * $img.Height
            if ($area -gt $bestArea) {
                $bestArea = $area
                $bestPath = $p.FullName
            }
        }
        finally {
            $img.Dispose()
        }
    }
    $pickPath = $bestPath
}

# #6C63FF
$purpleR = 0x6C
$purpleG = 0x63
$purpleB = 0xFF

$base = [FlowStateIconBuilder]::LoadAndRecolor($pickPath, $purpleR, $purpleG, $purpleB)
try {
    $dims = @(16, 32, 48, 96)
    $pngChunks = @(
        $null
        $null
        $null
        $null
    )
    for ($idx = 0; $idx -lt $dims.Count; $idx++) {
        $dim = $dims[$idx]
        $scaled = $null
        try {
            $scaled = [FlowStateIconBuilder]::ResizeTo($base, $dim)
            $pngChunks[$idx] = [FlowStateIconBuilder]::BitmapToPngBytes($scaled)
        }
        finally {
            if ($scaled) { $scaled.Dispose() }
        }
    }

    $icoPath = Join-Path $Root 'flowstate.ico'
    [FlowStateIconBuilder]::WriteMultiSizeIco($icoPath, $dims, $pngChunks)
}
finally {
    $base.Dispose()
}

$desktop = [Environment]::GetFolderPath('Desktop')
$lnk = Join-Path $desktop 'FlowState.lnk'
if (Test-Path -LiteralPath $lnk) {
    $wsh = New-Object -ComObject WScript.Shell
    $sc = $wsh.CreateShortcut($lnk)
    $icoFull = Join-Path $Root 'flowstate.ico'
    $sc.IconLocation = "$icoFull,0"
    $sc.Save()
}
else {
    Write-Warning "Desktop shortcut not found: $lnk (ICO still written to project root)."
}

Write-Host 'Done! Icon updated.'
