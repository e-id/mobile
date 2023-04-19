/*
In NativeScript, the app.ts file is the entry point to your application.
You can use this file to perform app-level initialization, but the primary
purpose of the file is to pass control to the app’s first module.
*/

import { Application, Frame } from '@nativescript/core'
import { handleOpenURL, AppURL } from '@nativescript-community/appurl';
import { MainViewModel } from './main-view-model';

function handleUrl(urlString: string) {
  console.log(urlString)
  if (urlString.startsWith('e-id://')) {
    urlString = 'https://' + urlString.substring(7)
    const mainPage = Frame.topmost().currentPage
    const context = <MainViewModel>mainPage.bindingContext
    context.onUrl(urlString)
  }
}

Application.on('launch', (args: any) => {
  if (args.iOS) {
    handleOpenURL((appURL: AppURL) => {
      handleUrl(appURL.toString())
    });
  }
})

Application.on('resume', (args: any) => {
  if (args.android) {
    const activity = args.android
    const intent = activity.getIntent()
    const url = intent.toUri(0)
    intent.setData(android.net.Uri.parse(''));
    const pos = url.indexOf('#Intent')
    handleUrl(url.substring(0, pos === -1 ? url.length : pos))
  } else {
    handleOpenURL((appURL: AppURL) => {
      handleUrl(appURL.toString())
    });
  }
})

Application.run({ moduleName: 'app-root' })

/*
Do not place any code after the application has been started as it will not
be executed on iOS.
*/
