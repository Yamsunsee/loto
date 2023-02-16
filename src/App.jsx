import { useMemo, useState, useEffect } from "react";

const App = () => {
  const [input, setInput] = useState("Đức, Hiển, Huyền, Luân, Quyên, Thức, Tiên, Trang");
  const [unitInput, setUnitInput] = useState(10);
  const [unit, setUnit] = useState(10);
  const [rounds, setRounds] = useState([]);
  const [isWin, setWin] = useState(false);
  const [isShow, setShow] = useState(false);
  const [isShowResult, setShowResult] = useState(true);
  const [isSettings, setSettings] = useState(false);
  const [players, setPlayers] = useState({});
  const [winners, setWinners] = useState([]);
  const [proxy, setProxy] = useState("");

  useEffect(() => {
    const storeRounds = JSON.parse(localStorage.getItem("loto-rounds"));
    if (storeRounds) setRounds(storeRounds);

    const storePlayers = JSON.parse(localStorage.getItem("loto-players"));
    if (storePlayers) setPlayers(storePlayers);
  }, []);

  const saveRounds = (rounds) => {
    localStorage.setItem("loto-rounds", JSON.stringify(rounds));
  };

  const savePlayers = (players) => {
    localStorage.setItem("loto-players", JSON.stringify(players));
  };

  const data = useMemo(() => {
    let text = "Có người kinh rồi!";
    let icon = "trophy";
    if (isWin) {
      text = "Chọn người kinh đi!";
      icon = "ribbon";
    }
    if (winners.length === 1) {
      text = "Chọn xong rồi! Tính tiền thôi!";
      icon = "calculator";
    }
    if (winners.length > 1) {
      text = "Chọn người đại diện nhận tiền!";
      icon = "person";
      if (proxy.length > 0) {
        text = "Chọn xong rồi! Tính tiền thôi!";
        icon = "calculator";
      }
    }
    return { text, icon };
  }, [isWin, winners, proxy]);

  const handleKeydown = ({ ctrlKey, key }) => {
    if (key === "Enter") ctrlKey ? handleNew() : handleAdd();
  };

  const getPlayers = (isAdd = false) => {
    let names = input
      .split(",")
      .map((name) => name.trim())
      .filter((name) => name.length > 0);
    setInput("");
    if (names.length < 1) return {};
    if (isAdd) names = names.filter((name) => !(name in players));
    const results = names.reduce((obj, cur) => {
      obj[cur] = {
        isActive: true,
        scores: {},
        bet: 1,
      };
      return obj;
    }, {});
    return results;
  };

  const getActivePlayerNames = (ignore = []) => {
    return Object.keys(players).filter((name) => players[name].isActive && !ignore.includes(name));
  };

  const getPrize = () => {
    const losers = getActivePlayerNames(winners);
    return Object.entries(players).reduce((total, [name, values]) => {
      if (losers.includes(name)) total += values.bet;
      return total;
    }, 0);
  };

  const handleDebtors = (oldDebtors, newDebtors, prize = 0) => {
    let results = oldDebtors;
    newDebtors.forEach((debtor) => {
      const debtorBet = prize !== 0 ? prize : players[debtor].bet;
      if (debtor in oldDebtors) results[debtor] += debtorBet * unit;
      else results[debtor] = debtorBet * unit;
      if (results[debtor] === 0) delete results[debtor];
    });
    return results;
  };

  const handleCreditors = (oldCreditors, newCreditors, bet) => {
    let results = oldCreditors;
    newCreditors.forEach((creditor) => {
      if (creditor in oldCreditors) results[creditor] -= bet * unit;
      else results[creditor] = -bet * unit;
      if (results[creditor] === 0) delete results[creditor];
    });
    return results;
  };

  const handleNew = () => {
    const newPlayers = getPlayers();
    setPlayers(newPlayers);
    setRounds([]);
    setWin(false);
    setShow(false);
    setSettings(false);
    setWinners([]);
    setProxy("");
  };

  const handleAdd = () => {
    setPlayers((prev) => {
      const newPlayers = { ...prev, ...getPlayers(true) };
      savePlayers(newPlayers);
      return newPlayers;
    });
  };

  const handleCalculate = () => {
    if (winners.length === 1) {
      const winner = winners[0];
      const newPlayers = Object.entries(players).reduce((obj, [name, values]) => {
        obj[name] = values;
        if (name === winner) {
          const debtors = getActivePlayerNames([name]);
          obj[name].scores = handleDebtors(values.scores, debtors);
        } else if (values.isActive) {
          obj[name].scores = handleCreditors(values.scores, [winner], values.bet);
        }
        return obj;
      }, {});
      setPlayers(newPlayers);
      savePlayers(newPlayers);
      setRounds((prev) => {
        const newRounds = [...prev, [winner]];
        saveRounds(newRounds);
        return newRounds;
      });
    } else if (winners.length > 1) {
      const prize = getPrize() / winners.length;
      const newPlayers = Object.entries(players).reduce((obj, [name, values]) => {
        obj[name] = values;
        if (name === proxy) {
          const debtors = getActivePlayerNames(winners);
          obj[name].scores = handleCreditors(
            handleDebtors(values.scores, debtors),
            winners.filter((item) => item !== proxy),
            prize
          );
        } else if (values.isActive) {
          if (!winners.includes(name)) {
            obj[name].scores = handleCreditors(values.scores, [proxy], values.bet);
          } else {
            obj[name].scores = handleDebtors(values.scores, [proxy], prize);
          }
        }
        return obj;
      }, {});
      setPlayers(newPlayers);
      savePlayers(newPlayers);
      setRounds((prev) => {
        const newRounds = [...prev, winners];
        saveRounds(newRounds);
        return newRounds;
      });
    }
  };

  const handleWin = () => {
    if (isWin && (winners.length === 1 || (winners.length > 1 && proxy.length > 0))) {
      handleCalculate();
      setWinners([]);
      setProxy("");
      setWin(false);
    } else {
      if (isSettings) return;
      setWin(true);
    }
  };

  const handleCancel = () => {
    setWinners([]);
    setProxy("");
    setWin(false);
  };

  const handleShow = () => {
    setShow((prev) => !prev);
  };

  const handleSettings = () => {
    if (isWin) return;
    if (isSettings) {
      const regex = /^\d+$/;
      const isValid = regex.test(unitInput);
      if (isValid) setUnit(unitInput);
      else setUnitInput(unit);
      setSettings(false);
    } else {
      setSettings(true);
    }
  };

  const handleSelect = (name) => {
    if (!isWin || isSettings || !players[name].isActive) return;
    setWinners((prev) => {
      return prev.includes(name) ? prev.filter((item) => item !== name) : [...prev, name];
    });
  };

  const handleProxy = (name) => {
    if (winners.length < 2) return;
    setProxy(name);
  };

  const handleActive = (target) => {
    const newPlayers = Object.entries(players).reduce((obj, [name, values]) => {
      obj[name] = values;
      if (name === target) {
        obj[name].isActive = !values.isActive;
      }
      return obj;
    }, {});
    setPlayers(newPlayers);
    savePlayers(newPlayers);
  };

  const handleBet = (target, isSubtract = false) => {
    const newPlayers = Object.entries(players).reduce((obj, [name, values]) => {
      obj[name] = values;
      if (name === target) {
        obj[name].bet = isSubtract ? Math.max(1, --values.bet) : ++values.bet;
      }
      return obj;
    }, {});
    setPlayers(newPlayers);
    savePlayers(newPlayers);
  };

  const handleDelete = (target) => {
    const newPlayers = Object.entries(players).reduce((obj, [name, values]) => {
      obj[name] = values;
      if (name === target) {
        delete obj[name];
      }
      return obj;
    }, {});
    setPlayers(newPlayers);
    savePlayers(newPlayers);
  };

  const displayMoney = (money) => {
    return parseFloat(money.toFixed(2)) + "k";
  };

  const displayTrophies = (player) => {
    const trophies = rounds.reduce((total, cur) => {
      if (cur.includes(player)) total += 1 / cur.length;
      return total;
    }, 0);
    return parseFloat(trophies.toFixed(2));
  };

  return (
    <div
      className={`flex min-h-screen select-none flex-col justify-between gap-8 bg-[url('/src/images/background.png')] px-4 py-8 font-bold text-white sm:p-8 ${
        isWin || isShow || isSettings ? "h-screen overflow-hidden" : null
      }`}
    >
      <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
        <div className="text-5xl font-black text-red-400">LÔ TÔ SHOW</div>
        {Object.keys(players).length > 0 && (
          <div className="flex rounded-lg border border-white/50 px-6 py-3">{unit}k / 1 tờ</div>
        )}
        <div className="flex flex-col items-center gap-4 sm:flex-row">
          <input
            className="rounded-lg border px-6 py-3 text-black focus:outline-none sm:w-[40rem]"
            type="text"
            value={input}
            placeholder="Nhập tên người chơi (không trùng nhau), ngăn cách nhau bởi dấu phẩy"
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={handleKeydown}
          />
          <div className="flex gap-4">
            <button className="button flex items-center gap-2" onClick={handleAdd}>
              <ion-icon name="add-circle"></ion-icon>
              <div>Bổ sung</div>
            </button>
            <button className="button flex items-center gap-2" onClick={handleNew}>
              <ion-icon name="sparkles"></ion-icon>
              <div>Ván mới</div>
            </button>
          </div>
        </div>
      </div>
      {Object.keys(players).length > 0 && (
        <div className="flex flex-col gap-8">
          {isWin ? (
            <div className="fixed inset-0 z-10 flex flex-col items-center gap-4 bg-[url('/src/images/background.png')] py-8 px-4 sm:relative sm:flex-row sm:justify-between sm:p-0">
              <div className="flex flex-col items-center gap-4 sm:flex-row">
                <button
                  className={`button sm:large ${
                    winners.length === 1 || (winners.length > 1 && proxy.length > 0) ? "active" : "disabled"
                  }`}
                  onClick={handleWin}
                >
                  <div className="flex items-center gap-2">
                    <ion-icon name={data.icon}></ion-icon>
                    <div>{data.text}</div>
                  </div>
                </button>
                {isWin && (
                  <button className="button sm:large cancel" onClick={handleCancel}>
                    <div className="flex items-center gap-2">
                      <ion-icon name="close-circle"></ion-icon>
                      <div>Huỷ</div>
                    </div>
                  </button>
                )}
              </div>
              <div className="flex flex-wrap justify-center gap-4">
                {winners.map((winner) => (
                  <button
                    key={winner}
                    className={`button ${proxy === winner ? "active" : ""}`}
                    onClick={() => handleProxy(winner)}
                  >
                    {winner}
                  </button>
                ))}
              </div>
              {winners.length > 0 && (
                <div className="text-center text-2xl sm:text-start">
                  <div>
                    <span>Tổng giải thưởng: </span>
                    <span className="text-yellow-400">{displayMoney(getPrize() * unit)}</span>
                  </div>
                  {winners.length > 1 && (
                    <div>
                      <span>Mỗi người nhận: </span>
                      <span className="text-yellow-400">{displayMoney((getPrize() * unit) / winners.length)}</span>
                    </div>
                  )}
                </div>
              )}
              <div className="flex flex-wrap justify-center gap-4 border-t border-white/20 pt-4 sm:hidden">
                {getActivePlayerNames().map((name) => (
                  <div
                    key={name}
                    onClick={() => handleSelect(name)}
                    className={`button ${winners.includes(name) ? "active" : null}`}
                  >
                    {name}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <button className="button large self-center sm:self-start" onClick={handleWin}>
              <div className="flex items-center gap-2">
                <ion-icon name={data.icon}></ion-icon>
                <div>{data.text}</div>
              </div>
            </button>
          )}
          <div className="flex flex-col justify-between gap-4 sm:flex-row">
            <div className="title">
              <span>Số lượng người chơi hiện tại: </span>
              <span className="text-red-400">{getActivePlayerNames().length} người</span>
            </div>
            <div className="flex justify-center gap-4">
              <button className={`button flex items-center gap-2 ${isShow ? "active" : null}`} onClick={handleShow}>
                <ion-icon name="receipt"></ion-icon>
                <div>Sao kê</div>
              </button>
              <button
                className={`button flex items-center gap-2 ${isWin ? "disabled" : isSettings ? "active" : null}`}
                onClick={handleSettings}
              >
                <ion-icon name="settings"></ion-icon>
                <div>Điều chỉnh</div>
              </button>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_6fr]">
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between" onClick={() => setShowResult((prev) => !prev)}>
                <div className="title">
                  <span>Kết quả</span>
                  <span className="text-sm text-red-400">
                    {rounds.length > 0 ? ` (Đã chơi ${rounds.length} ván)` : " (Chưa chơi ván nào)"}
                  </span>
                </div>
                <div className="flex items-center text-2xl text-blue-400">
                  {isShowResult ? <ion-icon name="chevron-up"></ion-icon> : <ion-icon name="chevron-down"></ion-icon>}
                </div>
              </div>
              {isShowResult &&
                (rounds.length > 0 ? (
                  <div>
                    {rounds.map((names, index) => (
                      <div key={names + index}>
                        <span>Ván {index + 1}: </span>
                        <span className="text-red-400">{names.join(", ")} </span>
                        <span>{names.length > 1 ? "kinh trùng" : "kinh"}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="border-t border-white/20 py-2 text-center">
                    Những người chơi <br /> đã kinh sẽ hiển thị ở đây!
                  </div>
                ))}
            </div>
            <div className="flex flex-col gap-4">
              {isSettings && (
                <div className="fixed inset-0 z-10 flex flex-col gap-4 overflow-scroll bg-[url('/src/images/background.png')] py-8 px-4 sm:p-8">
                  <div className="flex items-center justify-between">
                    <button className="button flex items-center gap-2" onClick={handleSettings}>
                      <ion-icon name="arrow-undo-circle"></ion-icon>
                      <div>Trở về</div>
                    </button>
                    <div className="flex rounded-lg border border-white/50 px-6 py-3">
                      <input
                        type="text"
                        value={unitInput}
                        className="w-[2ch] rounded-lg bg-transparent text-yellow-400 focus:outline-none"
                        onChange={(event) => setUnitInput(event.target.value)}
                      />
                      <div>k / 1 tờ</div>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    {Object.entries(players).map(([player, values]) => (
                      <div
                        key={player}
                        className={`player ${
                          !values.isActive ? "cursor-default text-white/50 hover:border-white/50" : null
                        }`}
                      >
                        <div className="flex items-center justify-between gap-4 sm:flex-row">
                          <div className="truncate text-2xl uppercase">{player}</div>
                          <div className="flex gap-12">
                            <div className={`item relative ${values.isActive ? "green" : "disabled"}`}>
                              <ion-icon name="reader"></ion-icon>
                              <div>{values.bet}</div>
                              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
                                <div className="flex cursor-pointer gap-16 text-2xl text-green-200">
                                  <div className="hover:text-green-400" onClick={() => handleBet(player, true)}>
                                    <ion-icon name="chevron-back-circle"></ion-icon>
                                  </div>
                                  <div className="hover:text-green-400" onClick={() => handleBet(player)}>
                                    <ion-icon name="chevron-forward-circle"></ion-icon>
                                  </div>
                                </div>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <div
                                className={`item ${values.isActive ? "remove" : "add"}`}
                                onClick={() => handleActive(player)}
                              >
                                {values.isActive ? (
                                  <ion-icon name="person-remove"></ion-icon>
                                ) : (
                                  <ion-icon name="person-add"></ion-icon>
                                )}
                              </div>
                              <div className="item remove" onClick={() => handleDelete(player)}>
                                <ion-icon name="trash"></ion-icon>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {isShow && (
                <div className="fixed inset-0 z-10 flex flex-col gap-4 overflow-scroll bg-[url('/src/images/background.png')] py-8 px-4 sm:p-8">
                  <button className="button flex items-center gap-2" onClick={handleShow}>
                    <ion-icon name="arrow-undo-circle"></ion-icon>
                    <div>Trở về</div>
                  </button>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    {Object.entries(players).map(([player, values]) => (
                      <div className="player" key={player}>
                        <div className="flex items-center justify-between">
                          <div className="truncate text-2xl uppercase">{player}</div>
                          <div className="flex gap-2">
                            <div className="item green">
                              <ion-icon name="reader"></ion-icon>
                              <div>{values.bet}</div>
                            </div>
                            <div className="item yellow">
                              <ion-icon name="trophy"></ion-icon>
                              <div>{displayTrophies(player)}</div>
                            </div>
                            <div className="item blue">
                              <ion-icon name="wallet"></ion-icon>
                              <div>
                                {displayMoney(
                                  Object.values(values.scores).reduce((total, cur) => {
                                    total += cur;
                                    return total;
                                  }, 0)
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                        {Object.entries(values.scores).length > 0 ? (
                          <div>
                            {Object.entries(values.scores).map(([name, value]) => (
                              <div key={name} className="border-t border-white/20 py-2 text-end">
                                <span>{name}: </span>
                                <span className={`${value > 0 ? "text-green-400" : "text-red-400"}`}>
                                  {displayMoney(value)}
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="border-t border-white/20 py-2 text-center">
                            Chưa chơi ván nào hoặc huề tiền!
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                {Object.entries(players).map(([player, values]) => (
                  <div
                    key={player}
                    className={`player ${
                      !values.isActive ? "cursor-default text-white/50 hover:border-white/50" : null
                    }`}
                    onClick={() => handleSelect(player)}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div
                        className={`truncate text-2xl uppercase ${winners.includes(player) ? "text-red-400" : null}`}
                      >
                        {player}
                      </div>
                      <div className="flex gap-2">
                        <div className={`item relative ${values.isActive ? "green" : "disabled"}`}>
                          <ion-icon name="reader"></ion-icon>
                          <div>{values.bet}</div>
                        </div>
                        <div className={`item ${values.isActive ? "yellow" : "disabled"}`}>
                          <ion-icon name="trophy"></ion-icon>
                          <div>{displayTrophies(player)}</div>
                        </div>
                        <div className={`item ${values.isActive ? "blue" : "disabled"}`}>
                          <ion-icon name="wallet"></ion-icon>
                          <div>
                            {displayMoney(
                              Object.values(values.scores).reduce((total, cur) => {
                                total += cur;
                                return total;
                              }, 0)
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
      <div className="mt-8 text-center text-sm opacity-20">
        <a href="https://yamdev.online/" target="_blank">
          @yamsunsee
        </a>
      </div>
    </div>
  );
};

export default App;
