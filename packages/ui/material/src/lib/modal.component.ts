import { NgClass, NgFor, NgIf } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  Directive,
  EventEmitter,
  inject,
  Input,
  Output,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import {
  MatDialog,
  MatDialogRef,
  MAT_DIALOG_DATA,
} from '@angular/material/dialog';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { Wallet } from '@heavy-duty/wallet-adapter';
import { HdWalletListItemComponent } from '@heavy-duty/wallet-adapter-cdk';
import { ComponentStore } from '@ngrx/component-store';
import { WalletName, WalletReadyState } from '@solana/wallet-adapter-base';
import { exhaustMap, tap } from 'rxjs';

interface ViewModel {
  isOpen: boolean;
}

const initialState: ViewModel = {
  isOpen: false,
};

@Directive({
  selector: '[hdWalletModalTrigger]',
  standalone: true,
  exportAs: 'hdWalletModalTrigger',
})
export class HdWalletModalTriggerDirective extends ComponentStore<ViewModel> {
  private readonly _matDialog = inject(MatDialog);

  @Input() hdPanelClass = '';
  @Output() hdSelectWallet = new EventEmitter<WalletName>();

  private readonly _handleOpen = this.effect<Wallet[]>(
    exhaustMap((wallets) => {
      this.patchState({ isOpen: true });

      return this._matDialog
        .open<HdWalletModalComponent, { wallets: Wallet[] }, WalletName>(
          HdWalletModalComponent,
          {
            panelClass: ['wallet-modal', ...this.hdPanelClass.split(' ')],
            maxWidth: '380px',
            maxHeight: '90vh',
            data: {
              wallets,
            },
          }
        )
        .afterClosed()
        .pipe(
          tap((walletName) => {
            if (walletName) {
              this.hdSelectWallet.emit(walletName);
            }
            this.patchState({ isOpen: false });
          })
        );
    })
  );

  constructor() {
    super(initialState);
  }

  open(wallets: Wallet[]) {
    this._handleOpen(wallets);
  }
}

@Component({
  selector: 'hd-wallet-modal',
  template: `
    <ng-container *ngIf="installedWallets.length > 0">
      <header>
        <button
          (click)="onClose()"
          mat-icon-button
          aria-label="Close wallet adapter selection"
        >
          <mat-icon>close</mat-icon>
        </button>
        <h2>Connect a wallet on Solana to continue</h2>
      </header>

      <mat-selection-list
        [multiple]="false"
        (selectionChange)="onSelectionChange($event.options[0].value)"
      >
        <mat-list-option
          *ngFor="let wallet of installedWallets"
          [value]="wallet.adapter.name"
        >
          <hd-wallet-list-item [hdWallet]="wallet"></hd-wallet-list-item>
        </mat-list-option>
        <mat-expansion-panel
          #expansionPanel="matExpansionPanel"
          class="mat-elevation-z0"
          disabled
        >
          <ng-template matExpansionPanelContent>
            <mat-list-option
              *ngFor="let wallet of otherWallets"
              [value]="wallet.adapter.name"
            >
              <hd-wallet-list-item [hdWallet]="wallet"> </hd-wallet-list-item>
            </mat-list-option>
          </ng-template>
        </mat-expansion-panel>
      </mat-selection-list>

      <button
        *ngIf="otherWallets.length > 0"
        class="toggle-expand"
        (click)="expansionPanel.toggle()"
        mat-button
      >
        <span>
          {{ expansionPanel.expanded ? 'Less options' : 'More options' }}
        </span>
        <mat-icon [ngClass]="{ expanded: expansionPanel.expanded }">
          expand_more
        </mat-icon>
      </button>
    </ng-container>

    <ng-container *ngIf="installedWallets.length === 0">
      <header>
        <button
          mat-icon-button
          (click)="onClose()"
          aria-label="Close wallet adapter selection"
        >
          <mat-icon>close</mat-icon>
        </button>
        <h2>You'll need a wallet on Solana to continue</h2>
      </header>

      <button
        class="getting-started"
        (click)="onGettingStarted()"
        color="primary"
        mat-flat-button
      >
        Get started
      </button>

      <mat-expansion-panel
        #expansionPanel="matExpansionPanel"
        class="mat-elevation-z0"
        disabled
      >
        <ng-template matExpansionPanelContent>
          <mat-selection-list
            [multiple]="false"
            (selectionChange)="onSelectionChange($event.options[0].value)"
          >
            <mat-list-option
              *ngFor="let wallet of otherWallets"
              [value]="wallet.adapter.name"
            >
              <hd-wallet-list-item [hdWallet]="wallet"> </hd-wallet-list-item>
            </mat-list-option>
          </mat-selection-list>
        </ng-template>
      </mat-expansion-panel>

      <button
        *ngIf="otherWallets.length > 0"
        class="toggle-expand"
        (click)="expansionPanel.toggle()"
        mat-button
      >
        <span>
          {{
            expansionPanel.expanded
              ? 'Hide options'
              : 'Already have a wallet? View options'
          }}
        </span>
        <mat-icon [ngClass]="{ expanded: expansionPanel.expanded }">
          expand_more
        </mat-icon>
      </button>
    </ng-container>
  `,
  styles: [
    `
      :host {
        display: block;
      }

      .mat-dialog-title {
        margin: 0;
      }

      header {
        margin-bottom: 2.5rem;
      }

      header h2 {
        font-size: 1.5rem;
        text-align: center;
        padding: 0 3rem;
        font-weight: bold;
      }

      header button {
        display: block;
        margin-left: auto;
        margin-right: 1rem;
        margin-top: 1rem;
      }

      .getting-started {
        display: block;
        margin: 2rem auto;
      }

      .toggle-expand {
        display: flex;
        justify-content: space-between;
        margin: 1rem 1rem 1rem auto;
        align-items: center;
      }

      .toggle-expand span {
        margin: 0;
      }

      .toggle-expand mat-icon {
        transition: 500ms cubic-bezier(0.4, 0, 0.2, 1);
      }

      .toggle-expand mat-icon.expanded {
        transform: rotate(180deg);
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [
    NgIf,
    NgFor,
    NgClass,
    MatButtonModule,
    MatIconModule,
    MatListModule,
    MatExpansionModule,
    HdWalletListItemComponent,
  ],
})
export class HdWalletModalComponent {
  private readonly _dialogRef =
    inject<MatDialogRef<HdWalletModalComponent, WalletName>>(MatDialogRef);
  private readonly _data = inject<{ wallets: Wallet[] }>(MAT_DIALOG_DATA);

  expanded = false;
  readonly installedWallets = this._data.wallets.filter(
    (wallet) => wallet.readyState === WalletReadyState.Installed
  );
  readonly otherWallets = [
    ...this._data.wallets.filter(
      (wallet) => wallet.readyState === WalletReadyState.Loadable
    ),
    ...this._data.wallets.filter(
      (wallet) => wallet.readyState === WalletReadyState.NotDetected
    ),
  ];
  readonly getStartedWallet = this.installedWallets.length
    ? this.installedWallets[0]
    : this._data.wallets.find(
        (wallet: { adapter: { name: WalletName } }) =>
          wallet.adapter.name === 'Phantom'
      ) ||
      this._data.wallets.find(
        (wallet: { adapter: { name: WalletName } }) =>
          wallet.adapter.name === 'Torus'
      ) ||
      this._data.wallets.find(
        (wallet: { readyState: WalletReadyState }) =>
          wallet.readyState === WalletReadyState.Loadable
      ) ||
      this.otherWallets[0];

  onSelectionChange(walletName: WalletName): void {
    this._dialogRef.close(walletName);
  }

  onGettingStarted(): void {
    this._dialogRef.close(this.getStartedWallet.adapter.name);
  }

  onClose(): void {
    this._dialogRef.close();
  }

  onToggleExpand(): void {
    this.expanded = !this.expanded;
  }
}
