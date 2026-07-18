# Mock data model

Default data lives in `src/services/mockData.js`; `src/services/dataService.js` is the only mutation boundary and persists a working copy to localStorage.

Entities: roles (`ROL`), users (`USR`), drivers (`DRV`), mechanics (`MEC`), vehicles (`VEH`), assignments (`ASN`), service types (`SVC`), schedules (`SCH`), maintenance (`MNT`), mileage logs (`MLG`), notifications (`NTF`), and audit logs (`AUD`). Relationships use stable IDs. Active assignment creation prevents a driver or vehicle from appearing in two simultaneous active assignments. Password fields exist only for harmless demo login and must never migrate as stored plaintext credentials.
