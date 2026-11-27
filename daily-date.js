(function () {
  'use strict';

  var pageDate = new Date();
  var epoch = Date.UTC(2025, 0, 1);
  var millisecondsPerDay = 86400000;

  function index(date) {
    // Compare calendar dates without counting any daylight-saving clock shifts.
    var localDate = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
    return (localDate - epoch) / millisecondsPerDay;
  }

  function key(date) {
    return date.getFullYear() + '-' + (date.getMonth() + 1) + '-' + date.getDate();
  }

  function reloadAtMidnight() {
    var pageDay = index(pageDate);
    var timer;
    var reloading = false;

    function checkDate() {
      if (reloading) return;
      clearTimeout(timer);
      var now = new Date();
      if (index(now) !== pageDay) {
        reloading = true;
        window.location.reload();
        return;
      }
      var midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      timer = setTimeout(checkDate, midnight - now);
    }

    window.addEventListener('pageshow', checkDate);
    window.addEventListener('focus', checkDate);
    document.addEventListener('visibilitychange', function () {
      if (!document.hidden) checkDate();
    });
    checkDate();
  }

  window.DFDailyDate = { pageDate: pageDate, index: index, key: key, reloadAtMidnight: reloadAtMidnight };
})();
