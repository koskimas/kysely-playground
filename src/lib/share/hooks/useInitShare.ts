import { useEffect, useState } from "react"
import { ShareUtils } from "src/lib/share/ShareUtils"
import { LogUtils } from "src/lib/log/LogUtils"
import { useStoreManager } from "src/lib/store/context/StoreManagerContext"
import { useRecoilState, useRecoilValue } from "recoil"
import { typescriptSchemaState } from "src/lib/typescript/atoms/typescriptSchemaState"
import { typescriptQueryState } from "src/lib/typescript/atoms/typescriptQueryState"
import { sqlDialectState } from "src/lib/sql/atoms/sqlDialectState"
import { kyselyVersionState } from "src/lib/kysely/atoms/kyselyVersionState"
import { loadingState } from "src/lib/loading/atoms/loadingState"
import { typescriptSchemaEditorEventsState } from "src/lib/editor/atoms/typescriptSchemaEditorEventsState"
import { typescriptQueryEditorEventsState } from "src/lib/editor/atoms/typescriptQueryEditorEventsState"
import { StoreUtils } from "src/lib/store/StoreUtils"
import { showTypescriptSchemaState } from "src/lib/ui/atoms/showTypescriptSchemaState"
import { sqlEditorSizeState } from "src/lib/ui/atoms/sqlEditorSizeState"

export function useInitShare() {
  const storeManager = useStoreManager()
  const [, setTypescriptSchema] = useRecoilState(typescriptSchemaState)
  const [, setTypescriptQuery] = useRecoilState(typescriptQueryState)
  const [, setSqlDialect] = useRecoilState(sqlDialectState)
  const [, setKyselyVersion] = useRecoilState(kyselyVersionState)
  const [, setShowTypescriptSchema] = useRecoilState(showTypescriptSchemaState)
  const [, setLoading] = useRecoilState(loadingState)
  const [, setSqlEditorSize] = useRecoilState(sqlEditorSizeState)
  const typescriptSchemaEditorEvents = useRecoilValue(typescriptSchemaEditorEventsState)
  const typescriptQueryEditorEvents = useRecoilValue(typescriptQueryEditorEventsState)
  const [didInit, setDidInit] = useState(false)

  useEffect(() => {
    if (didInit) {
      return
    }

    if (!typescriptSchemaEditorEvents || !typescriptQueryEditorEvents) {
      return
    }

    setDidInit(true)
    const item = ShareUtils.parseUrl()
    if (item === null) {
      LogUtils.info("No ShareItem")
      return
    }

    setLoading((v) => ({ ...v, initShare: true }))
    storeManager
      .load(item.storeProviderId, item.value)
      .then((v) => {
        LogUtils.info("Load", v)
        const storeItem = StoreUtils.getValidatedStoreItem(v)
        setSqlDialect(storeItem.sqlDialect)
        setKyselyVersion(storeItem.kyselyVersion)
        setTypescriptSchema(storeItem.typescriptSchema)
        setTypescriptQuery(storeItem.typescriptQuery)
        typescriptSchemaEditorEvents.setValue(storeItem.typescriptSchema)
        typescriptQueryEditorEvents.setValue(storeItem.typescriptQuery)
        setShowTypescriptSchema(storeItem.showTypescriptSchema)
        if (!storeItem.showTypescriptSchema) {
          setSqlEditorSize(window.document.body.clientWidth / 2)
        }
      })
      .finally(() => {
        setLoading((v) => ({ ...v, initShare: false }))
      })
  }, [
    setTypescriptSchema,
    setTypescriptQuery,
    setSqlDialect,
    setKyselyVersion,
    setShowTypescriptSchema,
    setLoading,
    typescriptSchemaEditorEvents,
    typescriptQueryEditorEvents,
    didInit,
    setDidInit,
  ])
}
