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
  private selected: string = ''
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

  get menuIcon(): string {
    return this.urlMode && this.selected !== '' ? '\uf08e' : '\uf0c9'
  }

  get cards(): any[] {
    return this._cards
  }

  set cards(items: any[]) {
    this._cards = items
    this.notifyPropertyChange('cards', items)
  }

  public isSelected(id: string): string {
    console.log(id)
    return ''
  }

  public getCardIds(): string[] {
    return JSON.parse(this.secureStorage.getSync({ key: 'cards' }) ?? '[]').filter((id: string) => id !== null)
  }

  public loadCards(): any[] {
    const ids = this.getCardIds()
    console.log(ids)
    const items = []
    ids.forEach((id: string) => {
      const card = JSON.parse(this.secureStorage.getSync({ key: id }))
      card.id = id
      card.selected = (id: string) => {
        console.log(this.urlMode, this.selected, id)
        return this.urlMode ? (this.selected === id ? '\uf192' : '\uf111') : ''
      }
      items.push(card)
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
    if (this.urlMode && this.selected !== '') {
      const data = this._cards.filter((item) => item.id === this.selected).shift()
      const url = this.url
      this.urlMode = false
      this.url = ''
      this.selected = ''
      this.notifyPropertyChange('menuIcon', this.menuIcon)
      this.cards = this.loadCards()
      const certKeys = Object.keys(data).filter((key) => key.includes('cert_'))
      const dataKeys = Object.keys(data).filter((key) => key.includes('data'))
      const fileKeys = Object.keys(data).filter((key) => key.includes('file'))
      while ((url + encodeURIComponent(JSON.stringify(data))).length > 32000) {
        var key = certKeys.length > 0 ? certKeys.shift() : (dataKeys.length > 0 ? dataKeys.shift() : (fileKeys.length > 0 ? fileKeys.shift() : undefined))
        console.log(`Remove ${key} from data`);
        if (typeof key !== 'undefined') {
          delete data[key]
        } else {
          delete data[Object.keys(data).pop()]
        }
      }
      console.log(url + encodeURIComponent(JSON.stringify(data)))
      Utils.openUrl(url + encodeURIComponent(JSON.stringify(data)))
    } else {
      this.menuOn = !this.menuOn
    }
  }

  public hideMenu(): void {
    console.log('hideMenu')
    this.menuOn = false
  }

  public onMenuItem(args: EventData): void {
    const button = <Button>args.object
    this.menuOn = false;
    if (button.id === 'scan') {
      this.onFab()
    }
  }

  public onItemTap(args: ItemEventData): void {
    if (this.menuOn) {
      this.menuOn = false
    }
    const list = <ListView>args.object
    const data = list.items[args.index]
    if (this.urlMode) {
      this.selected = data.id
      this.cards = this.loadCards()
      this.notifyPropertyChange('menuIcon', this.menuIcon)
      return
    }
    const url = 'https://e-id.github.io/viewer/?e-id-callback=eIdViewerDisplay#'
    /*
    const certKeys = Object.keys(data).filter((key) => key.includes('cert_'))
    const dataKeys = Object.keys(data).filter((key) => key.includes('data'))
    const fileKeys = Object.keys(data).filter((key) => key.includes('file'))
    while ((url + encodeURIComponent(JSON.stringify(data))).length > 8000) {
      var key = certKeys.length > 0 ? certKeys.shift() : (dataKeys.length > 0 ? dataKeys.shift() : (fileKeys.length > 0 ? fileKeys.shift() : undefined))
      console.log(`Remove ${key} from data`);
      if (typeof key !== 'undefined') {
        delete data[key]
      } else {
        delete data[Object.keys(data).pop()]
      }
    }
    */
    console.log((url + encodeURIComponent(JSON.stringify(data))).length, url + encodeURIComponent(JSON.stringify(data)))
    Utils.openUrl(url + encodeURIComponent(JSON.stringify(data)))
    // Dialogs.confirm({
    //   title: 'Preview',
    //   message: JSON.stringify(list.items[args.index], null, '  '),
    //   okButtonText: 'Close',
    //   cancelButtonText: 'Supprimer'
    // }).then((result) => {
    //   if (result === false) {
    //     const ids = this.getCardIds()
    //     delete ids[args.index]
    //     this.secureStorage.setSync({ key: 'cards', value: JSON.stringify(ids) })
    //     this.secureStorage.removeSync({ key: ids[args.index] })
    //     this.cards = this.loadCards()
    //   }
    // })
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
        this.cards = this.loadCards()
      }
    })
  }

  public onFab(): void {
    if (this.menuOn) {
      this.menuOn = false
    }
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
    Http.getJSON('https://dweet.io/get/dweets/for/' + qrCode).then((result: any) => {
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
            Http.getJSON('https://dweet.io/dweet/for/' + qrCode + '?now=' + encodeURIComponent(new Date().getTime() + loop)).then((result: any) => { /* console.log(result) */ });
          }, 1100)
          result = result.with.reverse()
          const privateKey = <rs.RSAKey>rs.KEYUTIL.getKey(result[0].content.private_key, rs.utf8tohex(password))
          delete result[0].content.private_key
          const card = {}
          result.forEach((entry: any) => {
            const content = entry.content
            Object.keys(content).forEach((key: string) => {
              console.log(key)
              try {
                if (Array.isArray(content[key]) || typeof content[key] === 'object') {
                  const chunks = Array.isArray(content[key]) ? content[key] : Object.values(content[key])
                  content[key] = ''
                  chunks.forEach((chunk: string) => {
                    content[key] += rs.KJUR.crypto.Cipher.decrypt(rs.b64tohex(chunk), privateKey, 'RSAOAEP')
                  })
                } else {
                  content[key] = rs.KJUR.crypto.Cipher.decrypt(rs.b64tohex(content[key]), privateKey, 'RSAOAEP')
                }
              } catch(e2) {
                content[key] = e2.message
              }
              const value = Array.isArray(content[key]) ? content[key].join('') : content[key]
              if (!Object.keys(card).includes(key)) {
                card[key] = value
              } else {
                card[key] += value
              }
            })
          })
          const id = 'card-' + new Date().getTime()
          const ids = this.getCardIds()
          ids.push(id)
          this.secureStorage.setSync({ key: 'cards', value: JSON.stringify(ids) })
          this.secureStorage.setSync({ key: id, value: JSON.stringify(card) })
          this.cards = this.loadCards()
          callback(true)
          return
        } catch(e) {
          console.log(e)
        }
      } else {
        // try again
        setTimeout(() => {
          this.add(qrCode, password, callback)
        }, 1250)
      }
      return
    });
  }
}
