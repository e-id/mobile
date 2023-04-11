import * as rs from 'jsrsasign'

import { Button, EventData, Observable, StackLayout, Dialogs, inputType, Http, ListView, ItemEventData, Utils } from '@nativescript/core'
import { BarcodeScanner } from 'nativescript-barcodescanner';
import { SecureStorage } from '@nativescript/secure-storage';

export class MainViewModel extends Observable {
  private _fabLeft: number
  private _fabTop: number
  private _menuLeft: number
  private _menuOn: boolean = false
  private _cards: any[] = []
  private url: string = ''
  private urlMode: boolean = false
  private secureStorage: SecureStorage

  constructor() {
    super()
    this.secureStorage = new SecureStorage()
    this.cards = this.loadCards()
  }

  get fabLeft(): number {
    return this._fabLeft
  }

  set fabLeft(left: number) {
    if (left !== this._fabLeft) {
      this._fabLeft = left
      this.notifyPropertyChange('fabLeft', left)
    }
  }

  get fabTop(): number {
    return this._fabTop
  }

  set fabTop(top: number) {
    if (top !== this._fabTop) {
      this._fabTop = top
      this.notifyPropertyChange('fabTop', top)
    }
  }

  get menuLeft(): number {
    return this._menuLeft
  }

  set menuLeft(left: number) {
    if (left !== this._menuLeft) {
      this._menuLeft = left
      this.notifyPropertyChange('menuLeft', left)
    }
  }

  get menuOn(): boolean {
    return this._menuOn
  }

  set menuOn(on: boolean) {
    if (on !== this._menuOn) {
      this._menuOn = on
      this.notifyPropertyChange('menuOn', on)
    }
  }

  get cards(): any[] {
    return this._cards
  }

  set cards(items: any[]) {
    this._cards = items
    this.notifyPropertyChange('cards', items)
  }

  public getCardIds(): string[] {
    return JSON.parse(this.secureStorage.getSync({ key: 'cards' }) ?? '[]').filter((id: string) => id !== null)
  }

  public loadCards(): any[] {
    const ids = this.getCardIds()
    console.log(ids)
    const items = []
    ids.forEach((id: string) => {
      items.push(JSON.parse(this.secureStorage.getSync({ key: id })))
    })
    return items
  }

  public layoutChanged(args: EventData): void {
    const layout = <StackLayout>args.object
    this.fabLeft = Math.round(layout.getActualSize().width - 100)
    this.fabTop = Math.round(layout.getActualSize().height - 100)
    this.menuLeft = Math.round(layout.getActualSize().width - 200)
  }

  public onMenu(): void {
    this.menuOn = !this.menuOn
  }

  public onMenuItem(args: EventData): void {
    const button = <Button>args.object
    this.menuOn = false;
    if (button.id === 'scan') {
      this.onFab()
    }
  }

  public onMain(): void {
    if (this.menuOn) {
      this.menuOn = false
    }
  }

  public onItemTap(args: ItemEventData): void {
    const list = <ListView>args.object
    if (this.urlMode) {
      const data = list.items[args.index]
      Utils.openUrl(this.url + encodeURIComponent(JSON.stringify(data)))
      this.urlMode = false
      this.url = ''
      return
    }
    Dialogs.confirm({
      title: 'Preview',
      message: JSON.stringify(list.items[args.index], null, '  '),
      okButtonText: 'Close',
      cancelButtonText: 'Supprimer'
    }).then((result) => {
      if (result === false) {
        const ids = this.getCardIds()
        delete ids[args.index]
        this.secureStorage.setSync({ key: 'cards', value: JSON.stringify(ids) })
        this.secureStorage.removeSync({ key: ids[args.index] })
        this.cards = this.loadCards()
      }
    })
  }

  public onUrl(urlString: string): void {
    Dialogs.confirm({
      title: 'Open e-ID',
      message: urlString.substring(8, urlString.lastIndexOf('/')) + ' wants to read from your saved cards data inside Open e-ID mobile.\n\nDo you agree?',
      okButtonText: 'Yes',
      cancelButtonText: 'No'
    }).then(result => {
      if (result) {
        this.url = urlString
        this.urlMode = true
      }
    })
  }

  public onFab(): void {
    let barcodescanner = new BarcodeScanner()
    barcodescanner.scan({
      formats: 'QR_CODE, EAN_13',
      beepOnScan: true,
      openSettingsIfPermissionWasPreviouslyDenied: true,
      presentInRootViewController: true
    }).then((scan) => {
      const self = this;
      setTimeout(() => {
        Dialogs.prompt({
          title: 'One-time password (OTP)',
          message: 'Please enter your one-time password (OTP) for this import',
          okButtonText: 'Confirm',
          cancelButtonText: 'Cancel',
          defaultText: '',
          inputType: inputType.password
        }).then(function (prompt) {
          if (prompt.result === true) {
            self.add(scan.text, prompt.text, (success: boolean) => {
              if (success === false) {
                Dialogs.alert({
                  title: 'Password',
                  message: 'Invalid one-time password (OTP). Please try again.',
                  okButtonText: 'Close'
                })
              }
            })
          }
        })
      }, 1000)
      }, (errorMessage) => {
        console.log(errorMessage)
      }
    )
  }

  public add(qrCode: string, password: string, callback: Function): void {
    Http.getJSON('https://dweet.io/get/latest/dweet/for/' + qrCode).then((result: any) => {
      if (result.this === 'succeeded') {
        try {
          // remove dweet by putting 5 dummy dweets
          let loop = 0.0
          const interval = setInterval(() => {
            loop += 0.1
            if (loop > 0.5) {
              clearInterval(interval)
              return
            }
            Http.getJSON('https://dweet.io/dweet/for/' + qrCode + '?now=' + encodeURIComponent(new Date().getTime() + loop)).then((result: any) => { console.log(result) });
          }, 1500)
          const content = result.with[0].content
          const privateKey = <rs.RSAKey>rs.KEYUTIL.getKey(content.private_key, rs.utf8tohex(password))
          delete content.private_key
          Object.keys(content).forEach((key: string) => {
            try {
              content[key] = rs.b64toutf8(rs.KJUR.crypto.Cipher.decrypt(rs.b64tohex(content[key]), privateKey, 'RSAOAEP'))
            } catch(e2) {
              delete content[key]
            }
          })
          const id = 'card-' + new Date().getTime()
          const ids = this.getCardIds()
          ids.push(id)
          this.secureStorage.setSync({ key: 'cards', value: JSON.stringify(ids) })
          this.secureStorage.setSync({ key: id, value: JSON.stringify(content) })
          this.cards = this.loadCards()
          callback(true)
          return
        } catch(e) {
          console.log(e)
        }
      }
      callback(false)
      return
    });
  }
}
