// Guest game credits live with their daily results, one record per game and day.
const DFGuestCoins = (() => {
  const balanceKey = 'tdf_coins_v2';
  const previousBalanceKey = 'tdf_coins_v1';

  function readInteger(value, fallback) {
    const number = Number(value);
    return value !== null && Number.isSafeInteger(number) && number >= 0 ? number : fallback;
  }

  function earned(storage) {
    // Before wallet credits were stored with results, both games used this total.
    let total = readInteger(storage.get('df_coins'), 0);
    try {
      for (let index = 0; index < localStorage.length; index++) {
        const key = localStorage.key(index);
        const game = /^(ds_result|dt_played)_\d{4}-\d{1,2}-\d{1,2}$/.exec(key);
        if (!game) continue;
        let result;
        try { result = JSON.parse(storage.get(key)); } catch (_) { continue; }
        if (game[1] === 'ds_result' && result?.won === true && result.walletCredit === 6) total += 6;
        if (game[1] === 'dt_played' && result?.correct === true && result.walletCredit === 3) total += 3;
      }
    } catch (_) {}
    return total;
  }

  function balance(storage) {
    let saved;
    try { saved = JSON.parse(storage.get(balanceKey)); } catch (_) {}
    const total = earned(storage);
    if (saved && readInteger(saved.balance, -1) >= 0 && readInteger(saved.earned, -1) >= 0) {
      return Math.max(0, saved.balance + total - saved.earned);
    }
    return readInteger(storage.get(previousBalanceKey), 10) + total;
  }

  function saveBalance(storage, balance) {
    storage.set(balanceKey, JSON.stringify({balance, earned: earned(storage)}));
  }

  function hasBalance(storage) {
    return storage.get(balanceKey) !== null || storage.get(previousBalanceKey) !== null;
  }

  return {balance, saveBalance, earned, hasBalance};
})();
