using UnityEngine;
using UnityEditor;
using System.Linq;
using System.IO;
using System;

public class CIBuilder
{
    [MenuItem("CI/BuildWebGL")]
    public static void PerformWebGLBuild()
    {
        try
        {
            string[] scenes = EditorBuildSettings.scenes
                .Where(s => s.enabled)
                .Select(s => s.path)
                .ToArray();

            if (scenes.Length == 0)
            {
                Debug.LogError("No scenes are added to the build");
                return;
            }

            string buildPath = "Builds/WebGL";
            if (!Directory.Exists(buildPath))
            {
                Directory.CreateDirectory(buildPath);
                Debug.Log("Created directory at : " + buildPath);
            }

            BuildPlayerOptions buildPlayerOptions = new BuildPlayerOptions();
            buildPlayerOptions.scenes = scenes; // Selects the scenes to add into the build
            buildPlayerOptions.locationPathName = buildPath; // Passes the path build to be located
            buildPlayerOptions.target = BuildTarget.WebGL; // Passes the build platform - must also set on the build profile
            buildPlayerOptions.options = BuildOptions.None; // 
            // these would be parameters
            // build -scenes -flag -target
            
            UnityEditor.Build.Reporting.BuildReport report = BuildPipeline.BuildPlayer(buildPlayerOptions);
            UnityEditor.Build.Reporting.BuildSummary summary = report.summary;

            if (summary.result == UnityEditor.Build.Reporting.BuildResult.Succeeded)
            {
                Debug.Log($"Build succeeded. {summary.totalSize} bytes written.");
            }
            else if (summary.result == UnityEditor.Build.Reporting.BuildResult.Failed)
            {
                Debug.LogError($"Build failed. {summary.totalErrors} errors.");
            }
            
        }
        catch (Exception ex)
        {
            Debug.LogError($"Critical Error: {ex.Message}");
        }
    }
}
