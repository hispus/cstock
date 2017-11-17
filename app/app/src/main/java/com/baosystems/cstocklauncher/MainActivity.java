package com.baosystems.cstocklauncher;

import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.content.pm.ResolveInfo;
import android.net.Uri;
import android.support.v7.app.AppCompatActivity;
import android.os.Bundle;
import android.util.Log;
import android.view.View;
import android.view.Window;

import java.util.List;

public class MainActivity extends Activity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        requestWindowFeature(Window.FEATURE_NO_TITLE);
        setContentView(R.layout.activity_main);
    }

    public void openTracker(View view) {
        startNewActivity(view.getContext(), "org.hisp.dhis.android.trackercapture");
    }

    public void openDataCollection(View view) {
        startNewActivity(view.getContext(),"org.dhis2.mobile");
    }

    public void openDashboard(View view) {
        startNewActivity(view.getContext(),"org.hisp.dhis.android.dashboard");
    }

    public void startNewActivity(Context context, String packageName) {
        PackageManager packageManager = getPackageManager();
        Intent intent = packageManager.getLaunchIntentForPackage(packageName);

        try {
            if (intent==null){
                intent = new Intent(Intent.ACTION_VIEW);
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                intent.setData(Uri.parse("market://details?id=" + packageName));
                startActivity(intent);
            }
            else {

                List<ResolveInfo> activities = packageManager.queryIntentActivities(intent, PackageManager.MATCH_DEFAULT_ONLY);
                boolean isIntentSafe = activities.size() > 0;

                if (isIntentSafe) {
                    // We found the activity now start the activity
                    startActivity(intent);
                } else {
                    // Bring user to the market to get the DHIS2 app
                    //Log.d("findNewActivity", packageName);
                    intent = new Intent(Intent.ACTION_VIEW);
                    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    intent.setData(Uri.parse("market://details?id=" + packageName));
                    startActivity(intent);
                }
            }
        } catch (Exception e) {
            Log.e("something", e.getMessage() + e.getStackTrace()[0].getLineNumber());
        }
    }

}
