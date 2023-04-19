# Open e-ID mobile app

The mobile app let users store card content on their mobile device to use from Open e-ID enabled websites.

The app responds to the desktop app URL scheme.

## Project status

The project is under developement and not yet ready for production.

## Usage

From Open e-ID viewer, a QR code can be generated to download the card data to the mobile app.

The following services are used to share and generate the QR code:

* jsrsasign https://github.com/kjur/jsrsasign/
* QR Code Generator https://goqr.me/
* Dweet https://dweet.io/

The card content is a JSON file divided into 5 dweets.

Each key in the content is encrypted using a RSA private key.

The private key is protected using a user-defined password.

Any website calling an `e-id:` url will launch the mobile app.

The user can choose an imported card content and send it back the website.

The process is the same as on the desktop app.

<img src="https://e-id.github.io/shots/mobile/mobile-ios-list.png" height="800" /> <img src="https://e-id.github.io/shots/mobile/mobile-android-list.jpg" height="800" />

[More screenshots](https://github.com/e-id/e-id.github.io/tree/main/shots/mobile)