import { useMemo, useState, useRef } from "react";

const App = () => {
  const [input, setInput] = useState("Đức, Hiển, Huyền, Luân, Quyên, Thức, Tiên, Trang");
  const [unitInput, setUnitInput] = useState(10);
  const [unit, setUnit] = useState(10);
  const [rounds, setRounds] = useState([]);
  const [isWin, setWin] = useState(false);
  const [isShow, setShow] = useState(false);
  const [isSettings, setSettings] = useState(false);
  const [players, setPlayers] = useState({});
  const [winners, setWinners] = useState([]);
  const [proxy, setProxy] = useState("");

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
    setPlayers(getPlayers());
    setRounds([]);
    setWin(false);
    setShow(false);
    setSettings(false);
    setWinners([]);
    setProxy("");
  };

  const handleAdd = () => {
    setPlayers((prev) => ({ ...prev, ...getPlayers(true) }));
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
      setRounds((prev) => [...prev, [winner]]);
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
      setRounds((prev) => [...prev, winners]);
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
  };

  const displayMoney = (money) => {
    if (money % 1 === 0) return money + "k";
    return money.toFixed(1) + "k";
  };

  return (
    <div className="flex min-h-screen select-none flex-col gap-8 bg-[url('/src/images/background.png')] p-8 font-bold text-white">
      <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
        <div className="text-5xl font-black text-red-400">LÔ TÔ SHOW</div>
        {Object.keys(players).length > 0 && (
          <div className="flex rounded-lg border border-white/50 px-6 py-3">
            {isSettings ? (
              <input
                type="text"
                value={unitInput}
                className="w-[2ch] rounded-lg bg-transparent text-yellow-400 focus:outline-none"
                onChange={(event) => setUnitInput(event.target.value)}
              />
            ) : (
              <div>{unit}</div>
            )}
            <div>k / 1 tờ</div>
          </div>
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
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <div className="flex flex-col items-center gap-4 sm:flex-row">
              <button
                className={`button large ${isSettings ? "disabled" : isWin ? "active" : null}`}
                onClick={handleWin}
              >
                <div className="flex items-center gap-2">
                  <ion-icon name={data.icon}></ion-icon>
                  <div>{data.text}</div>
                </div>
              </button>
              {isWin && (
                <button className="button large cancel" onClick={handleCancel}>
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
                  Tổng giải thưởng: <span className="text-yellow-400">{displayMoney(getPrize() * unit)}</span>
                </div>
                {winners.length > 1 && (
                  <div>
                    Mỗi người nhận:{" "}
                    <span className="text-yellow-400">{displayMoney((getPrize() * unit) / winners.length)}</span>
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_6fr]">
            <div className="flex flex-col gap-4">
              <div className="title">Kết quả</div>
              <div>
                {rounds.map((names, index) => (
                  <div key={names + index}>
                    Ván {index + 1}: <span className="text-red-400">{names.join(", ")}</span>{" "}
                    {names.length > 1 ? "kinh trùng" : "kinh"}
                  </div>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-4">
              <div className="flex flex-col justify-between gap-4 sm:flex-row">
                <div className="title">
                  Số lượng người chơi hiện tại:{" "}
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
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                {Object.entries(players).map(([player, values]) => (
                  <div
                    key={player}
                    className={`player ${
                      !values.isActive
                        ? "cursor-default text-white/50 hover:border-white/50"
                        : isWin
                        ? winners.includes(player)
                          ? "cursor-pointer border-red-300 hover:border-red-400"
                          : "cursor-pointer hover:border-white"
                        : null
                    }`}
                    onClick={() => handleSelect(player)}
                  >
                    <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
                      <div
                        className={`truncate text-2xl uppercase ${winners.includes(player) ? "text-red-400" : null}`}
                      >
                        {player}
                      </div>
                      <div className="flex gap-2">
                        <div className={`item relative ${values.isActive ? "green" : "disabled"}`}>
                          <ion-icon name="reader"></ion-icon>
                          <div>{values.bet}</div>
                          {isSettings && (
                            <div className="absolute left-1/2 -top-3/4 -translate-x-1/2">
                              <div className="flex cursor-pointer text-2xl text-green-200">
                                <div className="hover:text-green-400" onClick={() => handleBet(player, true)}>
                                  <ion-icon name="chevron-back-circle"></ion-icon>
                                </div>
                                <div className="hover:text-green-400" onClick={() => handleBet(player)}>
                                  <ion-icon name="chevron-forward-circle"></ion-icon>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                        <div className={`item ${values.isActive ? "yellow" : "disabled"}`}>
                          <ion-icon name="trophy"></ion-icon>
                          <div>
                            {rounds.reduce((total, cur) => {
                              if (cur.includes(player)) total += 1;
                              return total;
                            }, 0)}
                          </div>
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
                        {isSettings && (
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
                        )}
                      </div>
                    </div>
                    {isShow &&
                      (Object.entries(values.scores).length > 0 ? (
                        <div className="text-end">
                          {Object.entries(values.scores).map(([name, value]) => (
                            <div key={name} className="border-t border-white/20 py-2">
                              {name}:{" "}
                              <span
                                className={`${!values.isActive ? "opacity-50" : null} ${
                                  value > 0 ? "text-green-400" : "text-red-400"
                                }`}
                              >
                                {displayMoney(value)}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="border-t border-white/20 py-2 text-center">
                          Chưa chơi ván nào hoặc huề tiền!
                        </div>
                      ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
