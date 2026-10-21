// sw.js — シンセイ工業 現場管理アプリ Service Worker
// [2026-04-17] Network-first + 自動更新版
// - HTML/JS は毎回ネット取得（更新を即反映）、ネット無しだけキャッシュ
// - 画像・CDN は Cache-first（重いので）
// - 新SW検知で全タブ自動リロード
const CACHE_NAME = 'shinsei-v259'; // [2026-10-19] 就業規則PDFを差し替え（2027年の休日・有給の改正は助成金の支給決定後に延期）／ 会社情報に就業規則・育児介護規則のPDF／ 通信費3,000円を割増賃金の基礎に（V3）／ 熱中症の手順（会社情報・夏は打刻タブ）／ アナウンスを読んだら自分で消せる／ 休憩の確認（17時以降の退勤）・本人都合の早上がりは時間有給か欠勤を本人が選ぶ・現場終了の理由ボタン
// v251: // [2026-10-15] 管理画面の上の帯を2行に（グループ横一列＋選んだグループのタブだけ）、原価表のまとめを3つに分けて表示
// v250: // [2026-10-15] 集合（川畑宅）までは家が遠い人の車 1 台で途中の人を拾う（大塚→廣野→小野）
// v249: // [2026-10-15] 交通費の推定：社用車（運転）を選んだ人ごとに 1 台、相乗りは出勤ボタンの時刻が近い車へ。打刻に createdAt を読み込み
// v248: // [2026-10-15] 原価表タブ（経営）＋交通費の自動推定（相乗り・自家用・電車、ガソリン・高速）。関東の出入口一覧 ic_kanto.js
// v247: // [2026-10-15] 初めての現場は退勤の前に住所を登録（スマホの位置。交通費の基準・初回だけ）、管理画面に出面表タブ
// v246: // [2026-10-15] 管理画面を事前変換（Babel をやめ起動 約10秒→短縮）・管理者は Google のみ（PIN ボタンを外した）
// v245: // [2026-10-14] 請求の打診日：客先ごとに打診日（31＝月末）を設定。打診日の朝8時に役員・管理者へプッシュ通知（consult-reminder・pg_cron）、管理画面の上に打診日から7日間「打診する客先・現場・最新進捗%」を表示、「打診した」でその月は消える。請求日アラートが現場と一度も一致していなかった不具合を修正（client は全件空→lead も見る・会社名の表記ゆれを吸収）。migration 101（customers.consult_day / consult_done_month、〆日・打診日の初期値）。shared.js/admin.html/api-gateway / [2026-10-14] 早出：打刻修正に「早出」チェック。チェックした打刻がある日は 実働（休憩を除く）−6.5時間 を残業に（10分切り捨て、早く上がった日は少なくなる）。残業の割増を就業規則に合わせて 45Hまで1.25・45〜60Hは1.35・60H超は1.5 に。migration 100（clock_logs.early_start・clock_modifications.requested_early_start）。shared.js/admin.html/user.jsx/api-gateway / [2026-10-14] 8時前に出勤して8時前に退勤した記録（早朝の立ち寄り）で、出勤が8:00に置き換わり退勤より後になる不具合を修正（退勤が出勤より前なら出勤を実際に押した時刻に戻す）。api-gateway update_clock_out / user.jsx / [2026-10-09] 人工の目標単価72,000円・損益分岐65,000円に変更（app_settings も同じ値に更新）。shared.js / [2026-10-09] 人工目安の入れ方を変更：まん中のサイズで1人1日の数量＋小さい・大きいサイズで何%進むか（+/−）。サイズの幅がない行は％なし。migration 099（pct_small/pct_large）、api-gateway・shared.js・admin.html・user.jsx / [2026-10-09] 人工目安タブの説明から「わかる所だけでOK…」を削除。角ダクトの行に「2人1組で1日の数量」（migration 098）。user.jsx / [2026-10-09] 人工目安タブの最後に「補足」欄（自由記述・保存ボタン）。migration 097（wn-preset-memo）、api-gateway save_workload_input で補足の行だけ notes を保存。user.jsx / [2026-10-09] 川畑さん専用の「人工目安」タブ（1人1日あたりの数量を やりやすい/ふつう/やりにくい で入力。区分ごとの保存ボタン）。api-gateway list_workload_input/save_workload_input、migration 096（workload_norms に3段階の列と初期68行）。管理画面の人工目安タブに3段階を表示。user.jsx/shared.js/admin.html / [2026-10-08] 川畑さんの夏季・冬季手当の日額も8,000円に（法定休日の上乗せと同額）。shared.js / [2026-10-08] 給与計算：法定休日（日曜）出勤は振休を取っても割増分(日給×0.35)＋上乗せ額（川畑8,000円・他5,000円）を払うように。以前は買取希望だけ数えていて振休の分が0円だった。shared.js/admin.html / [2026-10-08] 緊急：朝9時前に進捗報告すると日付がUTCで前日扱いになり、強制の進捗報告画面から抜けられず打刻できなかった不具合を修正（JSTの日付で比較）。shared.js/user.jsx/admin.html / [2026-10-05] スタッフの打刻修正・追加を自動承認に（サーバで本人の打刻か確認→clock_logs に反映→approved・reviewed_by='自動承認'。反映失敗時のみ承認待ち）。api-gateway applyClockMod / user.jsx / [2026-10-02] スタッフの打刻修正申請で外注（なし／応援／請負＋人数）も直せるように。承認で clock_logs に反映（応援は35,000円×人数、請負金額は管理者）。migration 095。user.jsx/admin.html/shared.js/api-gateway / [2026-10-02] 管理画面に「お金」タブ（経営グループ）を追加：通帳残高から12か月の残高予測、出来高（請負×進捗%）の月別実績・見込み、損益分岐ライン、借入の完済と楽になる月、要注意の現場。入力は finance_data（migration 094・管理者のみ）に保存。admin.html/api-gateway(save_finance) / [2026-10-02] スタッフ画面の案件一覧で、完了した現場は完了から7日たったら出さない（完了日が無い古い完了現場も）。user.jsx / [2026-10-02] 使った人工が直近90日分しか数えられず少なく出ていた不具合を修正（打刻の初回読み込みを全件に）。shared.js / [2026-09-30] 管理画面ログインの並びを入れ替え（PINを上に大きく、Googleボタンは下に小さく）。admin.html / [2026-09-30] 管理画面に「登録済み端末（社長PC）ログイン」を追加。設定タブの「この端末を登録（ログインしたままにする）」で、Googleログイン中の管理者だけが端末セッション（sessions.auth_method='device'・1年）を発行→保存トークンを入れ替え、元のgoogleセッションは削除、Googleログアウトの案内を表示。登録済み端末の一覧（名前・登録日・期限・登録した人）と取り消し（管理者なら誰でも）。登録・取り消しは login_audit_logs に auth_method='device' で記録。端末セッションで「退出」すると確認ダイアログ（登録も解除される）。サーバは auth-google に register_device/list_devices/revoke_device を追加、Googleログイン時にメールを sessions.auth_email に保存。migration 093（sessions.device_label / auth_email）。admin.html/sw.js/auth-google / [2026-09-29] 管理画面のログインに「Googleでログイン」を追加（許可したGmail＝社長・勝間さんだけ。管理者s5として30日セッション）。ログイン画面の「このPCでログイン（Windows Hello）」ボタンは外した（設定タブの端末登録は残す）。PINでログインは移行期間のため残す。accounts.google.com はSWで横取りしない。サーバは新Edge Function auth-google＋migration 092（app_settings.google_client_id / admin_google_emails、login_audit_logs）。auth-pin のPIN停止時の案内を「Googleでログイン」に。admin.html/sw.js/auth-google/auth-pin / [2026-09-29] 案件一覧に「📦 完了した現場」切り替えボタン（完了案件だけを同じカードで表示）。admin.html / [2026-09-29] 進捗報告の「確認」が保存できているのに「確認の記録に失敗しました」と出る不具合を修正（apiWrite は true/false を返すのに res?.ok を見ていた）。管理者が自分で入れた報告は未確認に出さない。報告時刻をJST表示に。admin.html / [2026-09-29] 管理画面の📱ユーザービューにも赤字ライン人工を表示。admin.html / [2026-09-29] 目標単価の既定 65000→62000、損益分岐の既定 50000→52000（app_settings も同値に更新）。shared.js/user.jsx / [2026-09-29] スタッフ画面の人工進捗に「赤字ライン ○人工」（目標人工×目標単価÷損益分岐単価）を赤い小さい字で追加。user.jsx NinkuBar/BudgetSummary / [2026-09-29] 月次の進捗確認から完了した現場を外す（以前は完了後60日まで出ていた）。shared.js getProgressCheckRequests と スタッフ用の2か所 / [2026-09-29] 管理画面の「全現場に進捗報告を依頼」ボタンを撤去（一回だけDBで依頼済み）。客先の月次確認日を未設定の客先すべて20日に。admin.html / [2026-09-29] 案件の人工・粗利・判定を shared.js calcProjectCost 1本に統一（目標人工＝請負÷目標単価、判定＝請負÷(使った人工÷進捗%)で順調/注意/赤字、進捗未入力は判定しない、粗利の分母は請負額。追加工事込みは管理画面だけ併記）。設定タブに損益分岐単価、案件カードから進捗入力。月次の進捗確認が客先(lead)と照合されず1件も出ていなかった不具合を修正。AIチャットにも同じ計算結果を渡す（claude-proxy）。shared.js/admin.html/user.jsx/claude-proxy / [2026-09-29] 給与計算タブが空になる不具合を修正（staff.name が苗字だけでPAYROLL_MASTERのフルネームと一致しなかった。getPayrollMasterを苗字の前方一致に）。管理画面の退出後の行き先を / → /admin（パスキーのボタンが出る画面）に変更。shared.js/admin.html / [2026-09-26] 管理者向けパスキー（Windows Hello・スマホの画面ロック）ログイン段階1。admin.html のログイン画面に「このPCでログイン」、設定タブに端末の登録・一覧・削除。サーバは新Edge Function auth-passkey＋migration 091。auth-pin に段階2用の require_passkey 判定（既定false）。PINは今まで通り / [2026-09-25] セキュリティ監査「中」：退出時にサーバ側セッションも削除(sbServerLogout)、お知らせの✕は作成者か管理者のみ表示、監査ログの実行者名をサーバで確定、admin_notes等のanon権限剥奪(migration 090)。shared.js/admin.html/user.jsx/api-gateway / [2026-09-25] 年末年始の判定を就業規則どおり12/30〜1/3に修正(12/29開始になっていた)。shared.js getHolidayType と出退勤リマインダー2本。同日にapi-gateway rest_readのパス検証強化とauth-pinのPIN総当たり対策をデプロイ / [2026-09-24] 同じ日に有給と振休を両方登録できて1日を二重消化するバグを修正。重複チェックが種別一致(type)だけを見ていたため、有給と振休は別種別として素通りしていた(画面のsubmitLeave・api-gatewayのinsert_leave・DB制約027の3層すべて同じ問題)。丸一日休む種別(paid/furikae/special/absence)を相互排他グループとして扱うように変更し、別種別が既にある場合は「9/4は既に振替休日が承認です。同じ日に有給は取れません」と種別名を出して弾く。休日出勤(holiday)と遅刻・早退(late)は「休む」ではないのでグループに含めない。管理者の代理登録も同じinsert_leaveを通るためサーバー修正でカバーされる。DBのユニーク制約(staff_id,date)の追加は既存の重複データ1件(大塚さん2026-09-04 振休+有給)を解消してから別途行う。user.jsx/api-gateway / [2026-09-20] 管理画面の研修タブが、研修の対象外の人(管理者s5など)で開くと回答一覧が空になる不具合を修正。研修idを get_training で調べていたが、get_training は対象外の人に null を返すため。get_training_admin が trainingId 省略時に公開中の最新研修を自分で引くようにし、admin.html は id を渡さない。admin.html/api-gateway / [2026-09-20] 研修の完了画面で、完了カードのすぐ下に「まだ終わりではありません。この下のミニ教材を読んでください」の案内(教材3本の題名つき)を追加。教材に気づかず閉じる人が多いため。「問題とポイントを見返す」は教材の後ろへ移動(教材を先に読ませる)。研修タブの完了後ボタンを「もう一度見る」→「ミニ教材・ポイントを見る」に変更。user.jsxのみ / [2026-09-20] 研修を完了した瞬間に画面が消えてミニ教材・締めが読めない不具合と、研修タブの「もう一度見る」を押しても何も開かない不具合を修正(どちらも全画面研修の表示条件 completedAt→null が原因)。trainingReview フラグを追加し、完了直後と「もう一度見る」の間は完了者にも表示する。完了画面に「問題とポイントを見返す」(問題・自分の回答・ポイントを問題ごとに開閉)を追加。user.jsxのみ・DB/API変更なし / [2026-09-20] 研修で全問答えても「完了の記録に失敗しました」になる不具合を修正。入力停止800ms後の自動保存(confirmed=false)が「次へ」の確定(confirmed=true)の後から届いて上書きし、complete_trainingの確定数が足りなくなっていた。user.jsx: 確定時に待機中の自動保存タイマーを止める。api-gateway submit_training_response: 下書き保存では確定済みの回答を未確定に戻さない。あわせてtraining-01rのQ6・Q7の解説を勝間さんの指示どおり修正(migration 082・原文ママ) / [2026-09-20] 社内研修①を元原稿どおりに作り直し(migration 081: training-01r 全15問。069〜071のtraining-01は実装時に仕様書が見つからず設問・解説が作文されていたため080で非公開化)。設問・解説・締めは元原稿(社内研修①_元原稿_2026-09-06.md)から行番号指定で機械生成し一文字も変えていない。試写モードを追加(trainings.preview_staff_ids: 空でなければ入っている人にだけ研修が見え、その人は最低文字数の制限を受けない。まず裕太(s6)だけで流して確認する)。api-gateway get_training/submit_training_response/get_training_admin が対応。完了後のミニ教材3本も元原稿の内容(会社の利益と税金/NISA・積立・複利=30・40・45歳×月1〜3万の比較表を計算で生成/万が一への備え・埼玉県民共済)に差し替え。user.jsx/shared.js/api-gateway/migration 080-081 / [2026-09-09] モーダルの操作性を改善3点。①黒い余白のクリックで閉じないようにした(overlayのonClick={onClose}を撤去)。入力途中に誤って触れると打ち込んだ内容が消えて打ち直しになっていた。閉じるのは✕ボタンだけ。②✕ボタンを見出しごと position:sticky で上端に固定。案件編集のような縦に長いフォームでもスクロール後に✕を探して戻る必要がない(modal-contentのpaddingTopをヘッダー側へ移動)。③元請担当者を list=datalist で候補選択に対応。候補は顧客マスタの会社名・担当者名＋過去の案件で入力済みの値を重複除去して並べる。新規の元請は従来どおり直接入力できる(追加/編集の両モーダル)。あわせて前バージョンで追加した「現場編集」タブを撤去(案件一覧から編集できるため不要と判断)。api-gatewayに入れた admin_update_progress_report / admin_delete_progress_report / admin_update_handover_memo は呼び出し元が無くなるが、進捗報告の訂正手段として残す(admin限定・無害)。admin.htmlのみ・DB/API変更なし / [2026-09-09] 管理者画面に「現場編集」タブを追加(現場グループ)。案件を選ぶと進捗報告と引継ぎメモを一覧で直せる。従来どちらも登録しかできず、誤報告や誤字を直す手段が無かった(メモは削除して入れ直すしかなく、進捗は消すことすらできなかった)。api-gatewayに admin_update_progress_report / admin_delete_progress_report / admin_update_handover_memo を追加し、いずれも session.role!=='admin' で弾く(現場スタッフからは呼べない)。進捗はpercentとcommentを更新、commentは空文字も正当な値(消す操作)として扱う。住所・工事内容などの案件情報は項目が重複しないよう既存の案件編集モーダルを開くボタンに寄せた。図面は追加/削除APIしかなく差し替えは既存の案件詳細で足りるため今回は含めない。admin.html/shared.js/api-gateway。※api-gatewayデプロイ実施済・DB変更なし / [2026-09-08] 給与計算タブの実用化3点。①対象月を出勤簿(attendMonth)から分離しpayMonthを新設。出勤簿は進行中の月を見るため26日以降は翌月を選ぶが、給与計算は今締まった月を見たいので向きが逆(9/26に開くと10月度が出て空になっていた)。26日以降=当月度、25日以前=前月度を初期表示する。②職長手当をlocalStorage(shinsei_shokucho)に保存。キーを"YYYY-MM|氏名"にして月ごとに保持するため、リロードやタブ移動で消えず、過去月を開けばその月に入れた額が戻る(端末内のみ・DB不使用)。③初期ロード90日より古い月を選んだ時にensureClockLogsSinceで打刻を追加取得(出勤簿と同じ仕組み)。従来は6月以前を表示すると残業が0になっていた。admin.htmlのみ・DB/API変更なし / [2026-09-08] 管理者画面に給与計算タブを追加(勤怠グループ)。出勤簿の25日締め集計から、マネーフォワード給与へ入力する変動手当(所定休日出勤手当・法定休日出勤手当・夏季冬季手当・残業深夜手当)を算出する。基礎賃金=基本給+役職手当+一級技能士手当+職長手当(担当現場で変わるため月ごと手入力)。家族手当(3,000円/人)・功労手当(臨時)・通信費(実費補填)・熱中症対策費(真夏のみ)は労基法37条5項/施行規則21条の限定列挙に沿って割増賃金の基礎から除外。日給=基礎賃金÷22(丸めずに日数を掛ける。丸めると実績と1円ずれる)、時給=÷22÷所定労働時間(廣野のみ6.5H・他7.0H)、法定休日出勤=日給×0.35+α、夏季冬季=α×日数(α=川畑7,000/他5,000)、残業=時給×1.25(月60H超1.35/深夜1.5)。手当対象は買取希望の休日出勤のみ(振休は代休で消化)。マスタはshared.jsのPAYROLL_MASTER(役員は対象外)。実績の給与明細と6/7項目が一致することを検証済み。admin.html/shared.jsのみ・DB/API変更なし / [2026-09-07] 管理者の打刻編集フォームに「備考」欄を追加。従来 admin_edit_clock_log は clock_in/out/project_id/is_night_shift しか更新せず、出勤簿の備考を直す/消すには打刻を削除して入れ直すしか方法がなかった。空文字も正当な値(消す操作)として扱うため typeof note === "string" で判定し、省略時は既存値を維持する。api-gateway/shared.js(adminEditClockLog 第9引数)/admin.html。※要api-gatewayデプロイ / [2026-09-07] アプリのバージョン表記を v15 → v16 に更新(ログイン画面・スタッフ画面フッター・管理者画面の3箇所。src/user.jsx・admin.html・shared.jsヘッダ)。コード中の [v15] コメントは機能追加時期を示す履歴タグなので据え置き / [2026-09-07] 休日出勤の代理登録に日数(1日/半日)の選択を追加。土曜の半日出勤を1日として登録すると振休付与が過大になるため。既定は1日。admin.htmlのみ / [2026-09-07] 管理者画面の休暇詳細に「休日出勤を代理登録」を追加(日付+買取/振休を選んで登録。holidayはAPI側で自動承認のため承認済みで入る。insert_leaveは元から管理者の代理登録に対応済みだったが呼び出しがuser.jsxにしか無く管理者から登録できなかった)。同日の休日出勤が既にあれば弾く二重防御つき。あわせてapi-gateway admin_add_clock_logの備考から「管理者による追加: 」の接頭辞を廃止し、理由欄の入力をそのままnoteに入れる方式に変更(出勤簿の備考に区分を直接書けるように。理由欄が空なら備考も空。誰が追加したかはclock_modifications type:admin_new/requested_byに残るため監査情報は不変)。admin.html/sw.js/api-gateway。※api-gatewayデプロイ実施済・DB変更なし / [2026-09-06] アンケート対象者の判定を整理(migration 075)。①staff.survey_exempt を追加し staff_public に露出、管理者アカウント(s5)を全アンケートから恒久除外(毎回 exempt_staff_ids に書き足す運用にすると忘れるため属性化。is_executive と違い push通知・強制進捗報告等には影響しない) ②surveys.include_executives を追加し幸せアンケートのみ true にして役員(裕太)も内容確認のため対象に(既定falseなので次のアンケートは従来どおり役員除外) ③user.jsx の対象判定を mySurveys に集約し、全画面モーダル・アンケートタブ・締切ロック・タブ表示の4箇所が同じ条件を見るように統一(恒久除外/個別免除/役員参加の3種を1か所で判定)。admin.htmlの回答率の母数も同条件に追従。staff_public 再作成時の anon GRANT は 063 の指示どおり付けない。user.jsx/shared.js/admin.html/migration 075 / [2026-09-06] アンケートに回答免除リストを追加(migration 074: surveys.exempt_staff_ids TEXT[])。幸せアンケートから大塚さん(s2)を除外。免除者は全画面モーダルが出ず、締切後のロック対象にもならず、アンケートタブにも表示されず、管理者画面の回答率の母数からも外れる。is_executive を立てる方式は取っていない(あのフラグはpush通知・強制進捗報告・未退勤の強制解消モーダルまで一括で外すため副作用が大きい)。管理者画面のアンケート一覧に未回答者名と免除者名を表示。user.jsx/shared.js/admin.html/migration 074。DB変更のみでapi-gatewayの変更なし / [2026-09-06] 社内研修①に価値観パートQ9(全13問)を追加し全15問→全28問に(migration 071)。Q9は全問30文字以上・模範解答なし。Q9-1の前に一度だけセクション導入文を表示する仕組みを追加(training_questions.section_intro。設問より先に「本音を知りたい/気を使った答えだと会社が求めていないことをしてしまう」を読ませる。途中再開でセクション1問目に止まっていた場合も導入から出す)。あわせて役員(裕太)も研修対象に: trainings.include_executives を追加し社内研修①のみ true。user.jsxの全画面モーダル・タブ表示・締切ロックの判定を isExecutive 固定から研修ごとのフラグに変更し、api-gateway get_training_admin の未完了者の母数も同フラグに追従(アンケートは従来どおり役員除外のまま)。user.jsx/shared.js/api-gateway/migration 071。※要api-gatewayデプロイ+db push / [2026-09-05] 社内研修①「考えることが出来る職人になる」を実装(migration 068=スキーマ4表/069=研修本体+Q1-1〜Q7-3/070=Q8の4問。全15問)。設問→回答→ポイントの順送りで、未回答の問題は飛ばせない(進捗バーは表示専用でタップ不可)。入力は800ms止まったら自動保存(confirmed=false)し、電波が切れても打ち直しにならない。解説がある問題は最下部までスクロールしないと「次の問題へ」を押せない。Q1-2とQ8-1〜Q8-4は模範解答なしで一言だけ返す。全問確定でtraining_completionsに記録し、ミニ教材3本(税金/NISA試算/県民共済)と締めメッセージを表示。NISAは月額・年齢スライダーから毎回計算(ハードコードなし)、県民共済は月2,500円/5,000円コース切替・割戻率44.84%で実質負担を算出。締切2026-09-08 17:00 JSTはサーバー時刻で判定(端末の日付を変えても回避不可)。締切前は「あとで書く」で離脱でき打刻可、締切後は打刻と研修以外のタブを非表示。api-gatewayに get_training/submit_training_response/get_training_responses/delete_training_response/complete_training/get_training_admin を追加し、最低文字数と締切をサーバー側でも検証。管理者画面に研修タブ(完了/未完了の集計・未完了者リスト・社員ごとの回答一覧)。新規4テーブルはRLS有効化+anon権限を最初から剥奪。役員(裕太)は対象外。user.jsx/shared.js/admin.html/api-gateway/migration 068-070。※要api-gatewayデプロイ+db push / [2026-09-04] 幸せアンケートに最低文字数を追加(migration 067: 4問すべて minChars=30)。設問ごとの属性として持たせ、アプリ全体の一律ルールにはしない(お盆調査のような「8/13〜8/16」と答える設問を弾かないため。minChars未設定=従来通り1文字以上でOK)。入力欄の下に文字数カウンタ(あとN文字/達成で緑✓)を表示し、送信ボタンは全問が最低文字数に届くまで押せない。api-gateway submit_survey_response でもサーバー側検証(DevToolsやAPI直叩きで空回答を通せないように)。既存回答(川畑さん119文字)は送信時のみ検証のため影響なし。あわせて役員(裕太)をアンケート対象から完全に除外: user.jsxでアンケートタブ自体を非表示(強制モーダル・ロックは元から対象外)、admin.htmlの回答数の母数を staff.length → 役員を除いた人数に変更(永久に5/6で止まり未提出者がいるように見えるのを解消)。user.jsx/admin.html/api-gateway/migration 067。※要api-gatewayデプロイ+db push / [2026-09-04] 幸せ・働き方アンケート(migration 066: surveys.intro追加+設問投入。期限2026-09-08)。アンケートの出し方を全画面モーダルに一本化(ログイン時の小さいポップアップは廃止)し、期限内は最下部の「あとで書く(締切まであとN日)」で閉じられる/期限日以降は出口が「打刻だけする」に変わり打刻・アンケート以外のタブを非表示にする(打刻を通すのは労働時間の記録を止めないため)。回答済みでも締切前は「修正する」「回答を取り消す」が可能(api-gateway delete_my_survey_response追加・submit_survey_responseは締切後の書き直しをサーバ側で拒否)。自由記述はinput→textarea(fontSize16でiOSの自動ズーム防止)、設問にnote(補足文)とアンケートにintro(導入文)を表示。user.jsx/shared.js/api-gateway/migration 066。※要api-gatewayデプロイ+db push / [2026-08-07] 残業の計算ルールを変更(shared.js calcOvertime): ①起算を17:00→17:30に変更し17:30までの打刻は残業に含めない ②17:30を過ぎた時点で0.5H、以降は10分経過ごとに+10分(10分未満の端数は切り捨て) ③返り値を小数第1位(○.○H)に丸め。適用は OVERTIME_RULE_V2_FROM='2026-08-07' 以降の【出勤打刻】のみで、8/6以前の打刻は旧ルール(17:00起算・実測値)のまま計算されるため過去の集計・出勤簿PDF・給与の数字は変わらない。例:18:00退勤→1.0H / 18:10→1.2H / 18:29→1.0H。夜勤は従来通り残業対象外。shared.jsのみ・DB/API変更なし / [2026-07-27] 出勤簿タブで過去の打刻も編集可能に: ①過去月選択時に90日より古い打刻をDBから追加取得(attendMonth連動のensureClockLogsSince) ②スタッフ別リストに「期間内の全件を表示」トグル追加(従来は直近5件のみ編集可) ③編集/削除/承認/請負金額/打刻追加後のリロードを表示期間の開始まで含めて再取得(過去月分がstateから消える問題の予防)。admin.htmlのみ・DB/API変更なし / [2026-07-27] 管理者の打刻編集に「変更した旨を修正履歴に残す」チェックボックスを追加(既定ON)。OFFにすると clock_modifications に記録を残さず時刻だけ変更できる(admin.html 出勤簿タブの編集フォーム / shared.js adminEditClockLog / api-gateway admin_edit_clock_log が recordModification=false 受理。省略時は従来通り記録。※要api-gatewayデプロイ) / [2026-07-23] 案件詳細の追加工事セクションをアコーディオン化(デフォルト畳む・ヘッダーに「追加工事(N件)」と▶/▼開閉アイコン・タップで展開/折りたたみ。user.jsx案件一覧の詳細展開部+admin.html案件詳細モーダル両方) / [2026-07-23] 仕様・数量表の画像アップロードから名刺OCR(ocr_meishi)呼び出しを削除し保存のみに変更(名刺じゃない画像で「名刺ではありません」誤表示するバグ修正。OCRは名刺タブのみ残置。user.jsx isImage分岐) / [2026-07-22] お盆・年末年始の休日出勤を「有給繰越1日固定」→土曜と同じ「買取 or 振休の選択制」に変更(shared.js getHolidayAutoApplyConfig needUserChoice化 / user.jsx 申請フォームの繰越ボタン廃止・自動申請モーダル文言・日付選択時の自動プリセット解除 / api-gateway allowedPrefs obon,newyear=振休or買取 / claude-proxy enumから有給繰越削除)。理由: 就業規則上お盆・年末年始は「休日」であり休日に有給充当は法的に無効のため。キャリアアップ助成金申請に向けた帳簿整合の一環(2026年盆は8/13-16を休日処理・出勤者は割増+買取or振休)。過去の有給繰越レコードは表示互換のため残置。※要api-gateway・claude-proxyデプロイ+再ビルド / [2026-07-21] 出勤簿サマリーの強調表示(admin.html): 印刷ページの「出勤日数/実働合計/残業合計」テキスト行を5枠の統計ストリップ(出勤日数・実働合計・残業合計・土曜買取・夜間作業)に変更。残業/買取>0はオレンジ・夜間>0は藍色で強調。スタッフ別出勤簿カードにも🌙夜間h(>0時)と土曜買取日数を追加。集計ロジックは既存関数(calcNightWorkedHours/sumDays)の流用でDB/API変更なし / [2026-07-21] アンケートに回答期限(deadline)を追加(migration 064: surveys.deadline DATE)。期限あり=期限日まで任意回答(ログイン時ポップアップで案内・「後で回答する」可・残り日数表示)、期限を過ぎると未回答者は従来の強制モーダル(回答するまで打刻等不可)。期限なし=従来通り即強制。admin.htmlのアンケート作成/編集に期限日入力(任意)・一覧に期限/期限切れ表示・公開切替時にdeadlineが消えるのを防止。api-gateway upsert_surveyがdeadline受理(YYYY-MM-DD検証)。用途例:お盆休み希望調査など家族と相談してから答えたいアンケート / [2026-07-18] 起動時「接続エラー-Supabaseに接続できません」固着を修正: セッション切れ(スタッフ30分)で起動すると読み取り(2026-07-09にapi-gateway rest_read=認証必須へ集約)が全て401→loadStaff=null→接続エラー画面でハマり、PIN画面へ戻れなかった。shared.js sb()が401をapiGateway()同様に自動ログアウト扱いにしPIN画面へ誘導(sbHasSession追加)。user.jsxはセッション切れ時に接続エラーを出さずPIN表示・loadErr/loadingをクリア。バックエンド/DB変更なし・再ビルド要 / [2026-07-14] 材料費タブに明細検索を追加(admin.html。品名・規格・物件名・伝票Noの部分一致でブラウザ内フィルタ。検索中は請求書一覧を非表示・件数と合計金額を表示。DB/API変更なし) / [2026-07-14] 60秒ポーリングの打刻消え・重複を修正(user.jsx: 今日分を差し替える方式→id基準upsertマージ。①打刻直後サーバ応答前に新規ログが消えボタンが「出勤する」に戻り二重打刻を誘発 ②0時跨ぎで前日ログが重複=React key重複/人工二重計上、を解消) / [2026-07-14] 打刻の保存失敗時に緑の「✓記録しました」が誤表示される不具合を修正(user.jsx handleClockが成否を返し、doClick/finishOutがawaitで待って失敗時は✓を出さずidleに戻す。電波の悪い現場で打刻漏れに気づけるように)。※別途デプロイ済のバックエンド: auto-clockin-reminderが夜勤(直近25h)を朝の出勤忘れ通知の対象外に/migration063でstaff_public匿名読取を再封鎖/api-gateway rest_readで機密6テーブル(material_costs等)をadmin限定化 / [2026-07-14] 夜勤の残り不備を修正(監査続き): A[管理者打刻に夜勤フラグ]admin.htmlの打刻追加/編集モーダルに🌙夜勤チェックボックス+退勤>出勤の検証を追加。api-gateway admin_add/edit_clock_logがis_night_shiftを受理(夜勤の打刻忘れを管理者が日跨ぎ追加/修正しても日勤扱いにならず残業爆発しない)。※要api-gatewayデプロイ B[今日表示の夜勤日跨ぎ]shared.js isTodayOrActiveNight(当日 or 夜勤稼働中24h以内)を追加し、user.jsx(今日の履歴・メンバー状況・出勤中バッジ・稼働中◯名)とadmin.html(未打刻検出・メンバー状況)の抽出に適用。前夜開始の夜勤者が翌朝一覧から消える/二重出勤導線を解消 C[夜勤の長時間退勤に確認]ClockButtonで出勤から16h超の夜勤退勤時に「昨日の退勤忘れでは?」確認モーダル D[修正申請承認カードに翌表示]admin.htmlの変更前後表示にdateMDJST併記+isCrossDayClockで「翌」付与(逆転打刻と区別) E[夜勤退勤修正に実働プレビュー]未退勤強制モーダルの夜勤ケースに実働h/翌表示プレビュー+16h超警告。おまけ:管理者打刻編集の空出勤時刻クラッシュ防止。日勤ロジックは不変 / [2026-07-14] 夜勤バグ・セキュリティ修正(監査対応): ①夜勤の実人工・残業月報・労務費の過大計上を修正(admin.html 5箇所+shared.js calcActualMandaysに l.isNightShift?0: ガード追加。夜勤1件が最大4人工/架空残業12hに膨れる不具合。user画面とadmin画面の数値不一致も解消) ②夜勤明けの休日自動申請の誤発火を修正(user.jsx runClockOutFollowups: 休日判定を「退勤日」→「出勤日」基準に。金曜夜勤→土曜朝退勤で土曜休日出勤扱いになり振休/買取が承認済み自動登録される不具合。土曜半日判定も出勤時刻基準に) ③anon書き込み封鎖(migration 062: 公開anonキーでPostgRESTを直接叩き勤務時間・請負金額・有給を改ざんできた穴。057はSELECTのみ剥奪だったためINSERT/UPDATE/DELETEを全テーブルでREVOKE+既定権限剥奪+既知ポリシーDROP)。api-gateway等の関数は変更なし。※未対応の監査指摘(次回): staff_public anon読取復活(061)/rest_readのrole制御/朝の出勤忘れ通知の夜勤除外 等 / [2026-07-14] 夜勤打刻機能: 出勤時に日勤/夜勤を選択(通勤方法の近く)。夜勤=clock_logs.is_night_shift=true(migration 060)。夜勤は①openLog検出を24時間以内の未退勤に拡張(日付またぎ正常化) ②早上がり判定(16:00前)スキップ ③出勤8:00補正なし ④未退勤強制モーダルで翌朝時刻入力可(既定06:00・出勤以前は翌日扱い) ⑤実働=退勤-出勤(定時・休憩控除・残業の概念なし)・残業は0にガード。user.jsx/shared.js(calcNightWorkedHours・isCrossDayClock・fmtNightRange)/admin.html(🌙マーク・翌表示・打刻詳細/出勤簿PDFも夜勤対応)/api-gateway insert_clock_log。日勤ロジックは不変 / [2026-07-09] セキュリティ修正: ①claude-proxyのpdf_read/ocr_meishiにセッション認証必須化+OCR呼び出しをcallClaudeProxy化(無認証でのClaude API課金悪用を封鎖) ②staff_publicビューから日給(daily_rate)除外・adminはlist_staff_rates(admin限定API)で取得(migration 056) ③root/public逆同期(7/7の請求目安・強制進捗報告をrootへ取込) / [2026-07-07] 進捗機能強化: ①強制進捗報告モーダル(役員以外・今日が顧客の進捗確認日・その案件に打刻歴あり→報告するまで他操作不可。10%刻み+コメント+送信確認。1案件1日1報告で重複防止。shared.js getForcedProgressRequests / user.jsx forcedProgress・forcedConfirmId) ②admin案件詳細に「進捗vs人工消化のズレ」表示(人工消化%=実績人工÷目標人工(外注控除後)、ズレ=人工消化%−進捗%。+赤=オーバーペース/−緑=余裕あり) ③admin案件詳細に「請求目安」表示(実行予算=受注(請負+追加工事)−外注費 × 最新進捗% = 請求目安金額。あくまで目安) ※進捗確認日設定(顧客編集の進捗確認日1・2)は既存機能 / [2026-07-06] 退勤時の「退勤の写真(任意)」モーダルを非表示化。退勤打刻後は写真添付をスキップし外注確認等の既存フローへ直接進む(user.jsx。モーダルのコードは{false&&}で無効化して残置) / [2026-07-01] 予算消化バーの外注%凡例に「(見込み)」を付記(user.jsx BudgetSummary / admin.html NinkuBar 両方) / [2026-07-01] ユーザー側(user.jsx)案件一覧の詳細展開部から「メモ・添付ファイル」セクションを非表示化(管理者画面等のメモは残す) / [2026-07-01] 退勤打刻フローに「退勤の写真(任意)」添付を追加。退勤直後にモーダルで1枚添付→clock_logs.clock_out_photoに保存、管理者の打刻詳細でサムネ表示+ライトボックス。仕様数量表・引継ぎメモは既に画像対応済み / [2026-07-01] 予算消化バーに外注費分をオレンジ表示(人工=緑/外注=橙/残=灰、合計>100%で赤・凡例つき)。user.html(BudgetSummary)とadmin.html(NinkuBar)両方 / [2026-06-30] 管理者画面のタブをグループ化(勤怠/現場/スタッフ/管理/ツール)。グループ名タップで展開・折りたたみ。デフォルトは勤怠のみ展開・選択中タブのグループは自動展開。タブ名/機能は不変・表示順のみ整理 / [2026-06-29] 人工単価を案件ごとに設定可能化(projects.ninku_rate追加)。案件編集に「人工単価」入力欄追加(空欄=会社デフォルト)。目標人工=目標予算÷人工単価、外注控除後=目標人工−ceil(外注費÷人工単価)をリアルタイム表示。案件一覧/ユーザービュー/CostSummary/user.jsxの算出も案件単価で統一 / [2026-06-29] 案件編集の目標人工を金額入力方式に変更。「目標予算(円)」を入力→÷人工単価(7万)=目標人工を自動算出しリアルタイム表示(外注控除後も併記)。DBは従来通りtargetMandays(人工数)を保存。編集時は保存済人工数×単価で金額を逆算表示 / [2026-06-29] 目標人工: 手動設定があっても外注費を必ず差し引く方式に変更。手動185+外注430万→185−ceil(430万/7万=62)=123人工。user.jsx/admin.html統一 / [2026-06-29] 未退勤(前日以前の退勤打刻忘れ)の強制解消モーダル追加。役員以外はアプリ起動時に退勤時刻(標準17:00・微調整可)を入れるまで他操作不可。出勤打刻もブロックされ翌出勤前の解消も兼ねる(通知に頼らず「やらせる」方式) / [2026-06-29] 経費追加の外注費(category=subcontract)合計を案件のsubcontract_costに自動反映。api-gatewayのinsert/delete_expense_item後にrecalcSubcontractCost()でSUM再計算。案件編集の外注費欄は経費合計を自動表示の読み取り専用化。目標人工((請負−外注費)÷単価)も自動連動 / [2026-06-28] 目標人工: 管理者の手動設定(targetMandays>0)を優先・未設定なら(請負−外注費)÷70000で自動算出。user.jsx/admin.htmlで統一 / [2026-06-28] ユーザー側: 人工状況ランク(楽勝/平年/赤字線/赤字)を非表示 / 予算消化を人工消化率(実績人工÷目標人工)に修正・目標人工=(請負−外注費)÷70000で外注控除反映 / [2026-06-28] 進捗報告の管理者通知(未確認バナー+確認管理+管理者へPush) / ユーザー側の金額を完全非表示(退勤外注の応援費・予算消化の原価構成比) / [2026-06-22] 出勤簿: 振替休日残を全期間の累計残高として常に表示する独立セクション化(買取希望と休日出勤一覧は25日締め期間のまま) / [2026-06-22] 出勤簿: 買取希望・休日出勤一覧を25日締め期間(前月26日〜当月25日)に限定。ヘッダー期間表記を「YYYY年M月度(M/26〜M/25)」に変更 / [2026-06-17] 案件詳細に「図面データ」セクション追加(画像/PDFアップロード・サムネ/ライトボックス・投稿者&管理者のみ削除。project_drawingsテーブル+api-gateway insert/list/delete) / [2026-06-17] 目標人工に外注費控除を反映(admin表示のみ): 実行予算=請負−外注費 / 目標人工=実行予算÷単価。user側の保存値・表示は従来通り。追加見積に掛率(受注÷見積)列を追加・「概算」→「見積金額」改称・案件一覧に追加工事ブロックを別途表示 / [2026-06-17] 追加見積を外注費から分離。追加工事(受注=収入側)は請負金額に加算しトータル受注表示／外注費(支出側)は独立手入力のまま。api-gatewayのsubcontract_cost自動反映を廃止 / [2026-06-17] 緊急修正: babel-standalone v7.26.4固定で復旧
const SHELL_ASSETS = [
  '/',
  '/user',
  '/admin',
  '/shared.js',
  '/dist/user.js',
  '/dist/admin.js',
  '/ic_kanto.js',
  '/manifest.json',
  '/icon-192_v4.png',
  '/icon-512_v4.png',
];
const CDN_ASSETS = [
  'https://unpkg.com/react@18/umd/react.production.min.js',
  'https://unpkg.com/react-dom@18/umd/react-dom.production.min.js',
  // [2026-10-15] Babel は使わなくなったので先読みしない（管理画面は dist/admin.js）
];

// Network-first対象：HTML/JS（すぐ更新を反映したい）
const isAppCode = (url) => {
  if (url.hostname.includes('supabase.co')) return false;
  if (url.hostname !== self.location.hostname) return false;
  return url.pathname === '/' ||
         url.pathname === '/user' || url.pathname === '/admin' ||
         url.pathname.endsWith('.html') ||
         url.pathname.endsWith('.js') ||
         url.pathname === '/manifest.json';
};

// クライアントから「待機中のSWをすぐアクティブにしろ」メッセージを受ける
self.addEventListener('message', (e) => {
  if (e.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      await cache.addAll(SHELL_ASSETS).catch(() => {});
      for (const url of CDN_ASSETS) {
        try { await cache.add(url); } catch (_) {}
      }
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    // 古いキャッシュを削除
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)));
    await self.clients.claim();
    // 全クライアントに「新版あり」通知 → クライアント側で自動リロード
    const clients = await self.clients.matchAll({ type: 'window' });
    for (const client of clients) {
      client.postMessage({ type: 'SW_UPDATED', version: CACHE_NAME });
    }
  })());
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);

  // [2026-09-29] Googleログイン（accounts.google.com）は SW を通さずブラウザに任せる（スクリプトを古いままキャッシュしないため）
  if (url.hostname === 'accounts.google.com') return;

  // Supabase API: ネットワーク専用（キャッシュしない）
  if (url.hostname.includes('supabase.co')) {
    e.respondWith(
      fetch(e.request).catch(() =>
        new Response(JSON.stringify({ error: 'オフラインです。電波の良い場所で再試行してください。' }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' },
        })
      )
    );
    return;
  }

  // HTML/JS: Network-first（更新最優先）
  if (isAppCode(url)) {
    e.respondWith((async () => {
      try {
        const net = await fetch(e.request);
        if (net.ok && e.request.method === 'GET') {
          const clone = net.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(e.request, clone));
        }
        return net;
      } catch (_) {
        const cached = await caches.match(e.request);
        return cached || new Response('オフラインです', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
      }
    })());
    return;
  }

  // 画像・CDN・その他: Cache-first（速度優先）
  e.respondWith(
    caches.match(e.request).then((cached) => {
      if (cached) return cached;
      return fetch(e.request).then((resp) => {
        if (resp.ok && e.request.method === 'GET') {
          const clone = resp.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(e.request, clone));
        }
        return resp;
      }).catch(() =>
        new Response('オフラインです', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } })
      );
    })
  );
});

// オフライン打刻のバックグラウンド同期（将来拡張用）
self.addEventListener('sync', (e) => {
  if (e.tag === 'sync-clock') {
    e.waitUntil(syncOfflineClock());
  }
});

async function syncOfflineClock() {
  // IndexedDBからオフライン打刻を取得して送信（将来実装）
}

// [2026-04-24] Push通知受信
self.addEventListener('push', (e) => {
  const data = e.data ? e.data.json() : {};
  const title = data.title || 'シンセイ工業';
  const body  = data.body  || '';
  const url   = data.url   || '/user';
  e.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon:  '/icon-192_v4.png',
      badge: '/icon-192_v4.png',
      data:  { url },
      vibrate: [200, 100, 200],
    })
  );
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const url = e.notification.data?.url || '/user';
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      const existing = clients.find((c) => c.url.includes(self.location.origin));
      if (existing) { existing.focus(); existing.navigate(url); }
      else self.clients.openWindow(url);
    })
  );
});
