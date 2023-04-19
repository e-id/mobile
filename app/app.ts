/*
In NativeScript, the app.ts file is the entry point to your application.
You can use this file to perform app-level initialization, but the primary
purpose of the file is to pass control to the app’s first module.
*/

import { Application, Frame, isIOS } from '@nativescript/core'
import { handleOpenURL, AppURL } from '@bigin/ns-url-handler';
import { MainViewModel } from './main-view-model';

let lastUrl = ''

if (isIOS) {
  handleOpenURL((appURL: AppURL) => {
    console.log('Got the following appURL', appURL)
    if (lastUrl !== appURL.toString()) {
      lastUrl = appURL.toString()
      handleUrl(appURL.toString())
    }
  })
}

function handleUrl(urlString: string) {
  console.log(urlString)
  if (urlString.startsWith('e-id://')) {
    urlString = 'https://' + urlString.substring(7)
    setTimeout(() => {
      lastUrl = ''
      const mainPage = Frame.topmost().currentPage
      const context = <MainViewModel>mainPage.bindingContext
      context.onUrl(urlString)
    }, 1000)
  }
}

Application.on('resume', (args: any) => {
  if (args.android) {
    const activity = args.android
    const intent = activity.getIntent()
    const url = intent.toUri(0)
    intent.setData(android.net.Uri.parse(''));
    const pos = url.indexOf('#Intent')
    handleUrl(url.substring(0, pos === -1 ? url.length : pos))
  }
})

Application.run({ moduleName: 'app-root' })

/*
Do not place any code after the application has been started as it will not
be executed on iOS.
*/
