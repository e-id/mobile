import * as rs from 'jsrsasign'

import { Button, EventData, Observable, StackLayout, Dialogs, inputType, Http, ListView, ItemEventData, Utils, GestureEventData, isAndroid, isIOS, ActionItem } from '@nativescript/core'
import { BarcodeScanner } from 'nativescript-barcodescanner';
import { SecureStorage as AndroidSecureStorage } from '@nativescript/secure-storage';
import { SecureStorage } from '@heywhy/ns-secure-storage';
import { InAppBrowser } from 'nativescript-inappbrowser';
import { Menu } from 'nativescript-menu';

export class MainViewModel extends Observable {
  private _fabLeft: number = 0
  private _fabTop: number = 0
  private _cards: any[] = []
  private _selected: string = ''
  private url: string = ''
  private urlMode: boolean = false
  private longPress: boolean = false
  private secureStorage: AndroidSecureStorage|SecureStorage

  constructor() {
    super()
    if (isAndroid) {
      this.secureStorage = new AndroidSecureStorage()
    }
    if (isIOS) {
      this.secureStorage = new SecureStorage()
    }
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

  get cards(): any[] {
    return this._cards
  }

  set cards(items: any[]) {
    this._cards = items
    this.notifyPropertyChange('cards', items)
  }

  get selected(): string {
    return this._selected
  }

  set selected(selection: string) {
    if (selection !== this._selected) {
      this._selected = selection
      this.notifyPropertyChange('selected', selection)
    }
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
        return this.urlMode ? (this.selected === id ? '\uf192' : '\uf111') : ''
      }
      items.push(card)
    })
    return items
  }

  public layoutChanged(args: EventData): void {
    const layout = <StackLayout>args.object
    this.fabLeft = Math.round(layout.getActualSize().width - (isIOS ? 120 : 100))
    this.fabTop = Math.round(layout.getActualSize().height - (isIOS ? 220 : 100))
  }

  public onMenu(args: EventData): void {
    if (this.urlMode && this.selected !== '') {
      const data = this._cards.filter((item) => item.id === this.selected).shift()
      const url = this.url
      this.urlMode = false
      this.url = ''
      this.selected = ''
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
      if(isIOS) {
        const self = this
        Menu.popup({
          view: (<ActionItem>args.object).actionView,
          actions: [
            { id: 'scan', title: 'Scan' },
            { id: 'settings', title: 'Settings' },
            { id: 'about', title: 'About' }
          ],
          cancelButtonText: 'Cancel'
        }).then(action => {
            if (action.id === 'scan') {
              self.onFab()
            }
        }).catch(console.log)
      }
    }
  }

  public onItemTap(args: ItemEventData): void {
    const list = <ListView>args.object
    const data = list.items[args.index]
    if (this.longPress) {
      this.longPress = false
      Dialogs.confirm({
        title: 'Source',
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
      return
    }
    if (this.urlMode) {
      this.selected = data.id
      this.cards = this.loadCards()
      return
    }
    const url = 'https://e-id.github.io/viewer/?e-id-callback=eIdViewerDisplay#'
    InAppBrowser.open(url + encodeURIComponent(JSON.stringify(data)))
  }

  public onItemPress(args: GestureEventData): void {
    this.longPress = true
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
