const fs = require('fs');

// Fix UsageDialog
let usageCode = fs.readFileSync('src/pages/ConsumableItems/components/UsageDialog.tsx', 'utf-8');
usageCode = usageCode.replace('import { AlertTriangle, Check, ChevronsUpDown, Package } from "lucide-react";', 'import { AlertTriangle, Check, ChevronsUpDown, Package, PackageMinus, FlaskConical } from "lucide-react";\nimport { Badge } from "@/components/ui/badge";');
fs.writeFileSync('src/pages/ConsumableItems/components/UsageDialog.tsx', usageCode);

// Fix HistoryTab
let historyCode = fs.readFileSync('src/pages/ConsumableItems/HistoryTab.tsx', 'utf-8');
historyCode = historyCode.replace('import { Search, RefreshCw, History, Tag, ClipboardList, CheckCircle2 } from "lucide-react";', 'import { Search, RefreshCw, History, Tag, ClipboardList, CheckCircle2, X, AlertTriangle } from "lucide-react";');
historyCode = historyCode.replace('import { Input } from "@/components/ui/input";', 'import { Input } from "@/components/ui/input";\nimport { Label } from "@/components/ui/label";\nimport { Alert, AlertDescription } from "@/components/ui/alert";');
historyCode = historyCode.replace('export function HistoryTab({', 'interface HistoryTabProps { consumableProducts: Product[]; }\n\nexport function HistoryTab({');
fs.writeFileSync('src/pages/ConsumableItems/HistoryTab.tsx', historyCode);

// Fix ProductsTab
let productsCode = fs.readFileSync('src/pages/ConsumableItems/ProductsTab.tsx', 'utf-8');
productsCode = productsCode.replace('import { Search, FlaskConical, PackageMinus, Package, CheckCircle2, X } from "lucide-react";', 'import { Search, FlaskConical, PackageMinus, Package, CheckCircle2, X, AlertTriangle, RefreshCw, Tag } from "lucide-react";');
productsCode = productsCode.replace('import { Badge } from "@/components/ui/badge";', 'import { Badge } from "@/components/ui/badge";\nimport { Alert, AlertDescription } from "@/components/ui/alert";');
productsCode = productsCode.replace('interface ProductsTabProps {\n  consumableProducts: Product[];\n  onRecordUsage: (productId?: string) => void;\n}', 'interface ProductsTabProps {\n  consumableProducts: Product[];\n  onRecordUsage: (productId?: string) => void;\n  productsLoading: boolean;\n  productsError: boolean;\n  refetchProducts: () => void;\n}');
productsCode = productsCode.replace('export function ProductsTab({ consumableProducts, onRecordUsage }: ProductsTabProps) {', 'export function ProductsTab({ consumableProducts, onRecordUsage, productsLoading, productsError, refetchProducts }: ProductsTabProps) {');
productsCode = productsCode.replace(/openUsageDialog/g, 'onRecordUsage');
fs.writeFileSync('src/pages/ConsumableItems/ProductsTab.tsx', productsCode);

// Fix index.tsx
let indexCode = fs.readFileSync('src/pages/ConsumableItems/index.tsx', 'utf-8');
indexCode = indexCode.replace('<ProductsTab consumableProducts={consumableProducts} onRecordUsage={openUsageDialog} />', '<ProductsTab consumableProducts={consumableProducts} onRecordUsage={openUsageDialog} productsLoading={productsLoading} productsError={productsError} refetchProducts={refetchProducts} />');
fs.writeFileSync('src/pages/ConsumableItems/index.tsx', indexCode);

