Swarm
=====

All requests must be prepended by 64-bit hex identifier, that will be used to identify reply to specified request.

For example:

```
> 98f878962342fa3c DATA GET 42
< 98f878962342fa3c DATA GET_OK 42 7 6 Answer
```

`>` and `<` signs used only for indication of request/response, it is not a part of the protocol.

# DATA
```
> DATA GET (id)
< DATA GET_OK (id) (version) (size) (binary)
```

```
> DATA DELETE1 (id) (version)

  < DATA DELETE1_OK (id) (version)
| < DATA DELETE1_FAIL (id) (version) (new_version)
```

`DELETED` can reply with `version = 0`, if item was not exist.

Data versions:
* 0 — not exists
* 1 — stored by `PUT0` or `PUT1`, can be overwritten by them
* 2+ — stored by `PUT2` or `PUT3`, cannot be overwritten by `PUT0` or `PUT1`

```
> DATA PUT0 (id) (data)
```

Overwrites data, if version is `0` or `1`, does not responds.

```
> DATA PUT1 (id) (data)

  < DATA PUT1_OK (id) (old_version)
| < DATA PUT1_FAIL (id) (new_version)
```

```
> DATA PUT2 (id) (version) (data)

  < DATA PUT2_OK (id) (version)
| < DATA PUT2_FAIL (id) (new_version)
```

Stores data only if `version` is bigger, than stored.

```
> DATA PUT3 (id) (version) (rejectid:rand64) (timeout:ms) (length) (binary)

  < DATA PUT3_ACCEPT (putid)
| < DATA PUT3_FAIL (id) (new_version)

> DATA PUT3_CONFIRM (id) (version) (putid)

  < DATA PUT3_CONFIRM_OK (id) (version) (putid)
| < DATA PUT3_CONFIRM_FAIL (id) (new_version)

> DATA PUT3_REJECT (id) (version) (rejectid) (putid | 0)

  < DATA PUT3_REJECT_OK

< DATA PUT3_REJECTED (id) (version) (rejectid) (putid)
```

`PUT3_REJECT` is not cancels `PUT3_CONFIRM`.

When `PUT3_CONFIRM` received by acceptor, data will be stored.

**WARNING:** if you will not got quorum of `PUT3_CONFIRM_OK`, data **can** be inconsistent (i.g. smaller part of cluster can have version bigger, than rest). So, after such incident, after `DATA GET` over `(N/2)+1` nodes, you can get old data from all nodes (excluding unavailable), or 1+ nodes with bigger version.

So, all your actions on data must follow this requirements:

* **Deterministic** — when **action** is applied to the **state**, you must always get same **new state**.
* **Idempotence** — if **action** is applied to the **state** twice, you must always get same **new state**, as you had applied it only once.