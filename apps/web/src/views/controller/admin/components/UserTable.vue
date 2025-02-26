<script setup lang="ts">
import { ref, reactive } from 'vue'
import { FilterMatchMode } from '@primevue/core/api'
import UserService from '@/service/user.service'
import { useToast, DataTableFilterMeta } from 'primevue'
import type { IUserResponse } from '@workspace/shared'

// Import PrimeVue-Komponenten
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import Select from 'primevue/select'
import DatePicker from 'primevue/datepicker'

const props = defineProps<{
    users: IUserResponse[]
    groupSelect: SelectOption[]
}>()

const emits = defineEmits<{
    (e: 'user-updated', updatedUser: IUserResponse): void
}>()

const toast = useToast()

// Lokale Zustände der Tabelle
const filters = ref<DataTableFilterMeta>({})
const editingRows = ref<any[]>([])
const loading = ref(false)

// Ermittlung der Rollenoptionen (z. B. Teacher/Controller)
import { UserRole } from '@workspace/shared'
import { getObjectAsSelectOptions } from '@/helpers/functions'
import { SelectOption } from '@/types'
const roles = reactive(getObjectAsSelectOptions(UserRole))

/**
 * Initialisiert die Filtereinstellungen für die Tabelle.
 */
const initFilters = () => {
    filters.value = {
        global: { value: null, matchMode: FilterMatchMode.CONTAINS },
        username: { value: null, matchMode: FilterMatchMode.STARTS_WITH },
        firstName: { value: null, matchMode: FilterMatchMode.STARTS_WITH },
        lastName: { value: null, matchMode: FilterMatchMode.STARTS_WITH },
        role: { value: null, matchMode: FilterMatchMode.EQUALS },
        // Zusätzlich: Filter für Lehrgruppe und Ruhestandsdatum bei Lehrenden
        'Teacher.teachingGroupId': {
            value: null,
            matchMode: FilterMatchMode.EQUALS,
        },
        'Teacher.retirementDate': {
            value: null,
            matchMode: FilterMatchMode.DATE_IS,
        },
        createdAt: { value: null, matchMode: FilterMatchMode.DATE_IS },
        updatedAt: { value: null, matchMode: FilterMatchMode.DATE_IS },
    }
}
initFilters() // Direkt beim Laden der Komponente

/**
 * Formatiert ein Datum als String im Format "TT.MM.JJJJ".
 * @param value Datum als String, Date oder null
 * @returns Formatierter Datum-String oder '-' falls kein Datum vorhanden
 */
const formatDate = (value: string | Date | null) => {
    if (!value) return '-'
    return new Date(value).toLocaleDateString('de-DE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    })
}

/**
 * Ermittelt den Namen einer Lehrgruppe anhand der übergebenen ID.
 * @param id ID der Lehrgruppe
 * @returns Name der Lehrgruppe oder '-' falls nicht gefunden
 */
const getGroupName = (id: number) => {
    const group = props.groupSelect.find((s) => s.value === id)
    return group ? group.label : '-'
}

/**
 * Speichert die Änderungen einer Tabellenzeile und aktualisiert den Nutzer über den Service.
 * Gibt bei Erfolg das aktualisierte Nutzerobjekt via Event an die Elternkomponente weiter.
 * @param event Enthält die neuen Daten der bearbeiteten Zeile
 */
const onRowEditSave = async (event: { newData: IUserResponse }) => {
    const { newData } = event
    if (newData.Teacher) {
        // Setze Uhrzeit für das Ruhestandsdatum auf 23:59:59 Uhr
        newData.Teacher.retirementDate.setHours(23, 59, 59, 999)
    }
    const res = await UserService.updateUser(newData)
    if (res.error) {
        toast.add({
            severity: 'error',
            summary: 'Fehler',
            detail: res.error,
            life: 5000,
        })
    } else {
        emits('user-updated', res.data)
    }
}
</script>
<template>
    <DataTable
        :value="users"
        :paginator="true"
        :rows="10"
        size="small"
        data-key="id"
        :row-hover="true"
        filter-display="row"
        :loading="loading"
        v-model:filters="filters"
        :global-filter-fields="['username', 'role', 'firstName', 'lastName']"
        v-model:editing-rows="editingRows"
        editMode="row"
        @row-edit-save="onRowEditSave"
    >
        <!-- Kopfbereich der Tabelle: Globaler Filter und Filter-Reset -->
        <template #header>
            <div class="flex justify-between">
                <Button
                    type="button"
                    icon="pi pi-filter-slash"
                    label="Filter aufheben"
                    outlined
                    @click="initFilters"
                />
                <div class="flex items-center gap-2">
                    <i class="pi pi-search" />
                    <!-- @vue-expect-error -->
                    <InputText
                        v-model="filters['global'].value"
                        placeholder="Globale Suche"
                    />
                </div>
            </div>
        </template>

        <!-- Anzeige, wenn keine Nutzer vorhanden sind -->
        <template #empty>Keine Nutzer gefunden.</template>

        <!-- Spalte: ID -->
        <Column field="id" header="ID" style="min-width: 6rem" sortable>
            <template #body="{ data }">{{ data.id }}</template>
        </Column>

        <!-- Spalte: Nutzername -->
        <Column field="username" header="Nutzername" style="min-width: 10rem">
            <template #body="{ data }">{{ data.username }}</template>
            <template #editor="{ data, field }">
                <InputText v-model="data[field]" />
            </template>
            <template #filter="{ filterModel, filterCallback }">
                <InputText
                    @input="filterCallback()"
                    v-model="filterModel.value"
                    type="text"
                    placeholder="Nutzername suchen"
                />
            </template>
        </Column>

        <!-- Spalte: Vorname -->
        <Column field="firstName" header="Vorname" style="min-width: 10rem">
            <template #body="{ data }">{{ data.firstName }}</template>
            <template #editor="{ data, field }">
                <InputText v-model="data[field]" />
            </template>
            <template #filter="{ filterModel, filterCallback }">
                <InputText
                    @input="filterCallback()"
                    v-model="filterModel.value"
                    type="text"
                    placeholder="Vorname suchen"
                />
            </template>
        </Column>

        <!-- Spalte: Nachname -->
        <Column field="lastName" header="Nachname" style="min-width: 10rem">
            <template #body="{ data }">{{ data.lastName }}</template>
            <template #editor="{ data, field }">
                <InputText v-model="data[field]" />
            </template>
            <template #filter="{ filterModel, filterCallback }">
                <InputText
                    @input="filterCallback()"
                    v-model="filterModel.value"
                    type="text"
                    placeholder="Nachname suchen"
                />
            </template>
        </Column>

        <!-- Spalte: Rolle -->
        <Column
            field="role"
            header="Rolle"
            style="min-width: 10rem"
            filter-field="role"
            :show-filter-menu="false"
        >
            <template #body="{ data }">{{ data.role }}</template>
            <template #filter="{ filterModel, filterCallback }">
                <Select
                    @change="filterCallback()"
                    v-model="filterModel.value"
                    :options="roles"
                    option-label="label"
                    option-value="value"
                    placeholder="Rolle auswählen"
                    show-clear
                />
            </template>
        </Column>

        <!-- Spalte: Lehrgruppe -->
        <Column
            field="teachingGroupId"
            filter-field="Teacher.teachingGroupId"
            header="Lehrgruppe"
            style="min-width: 10rem"
            :show-filter-menu="false"
        >
            <template #body="{ data }">
                {{ getGroupName(data.Teacher?.teachingGroupId) }}
            </template>
            <template #editor="{ data, field }">
                <template v-if="data.Teacher">
                    <Select
                        v-model="data.Teacher[field]"
                        :options="groupSelect"
                        option-label="label"
                        option-value="value"
                    />
                </template>
                <template v-else> - </template>
            </template>
            <template #filter="{ filterModel, filterCallback }">
                <Select
                    @change="filterCallback()"
                    v-model="filterModel.value"
                    :options="groupSelect"
                    option-label="label"
                    option-value="value"
                    placeholder="Lehrgruppe auswählen"
                    show-clear
                />
            </template>
        </Column>

        <!-- Spalte: Ruhestandsdatum -->
        <Column
            field="retirementDate"
            filter-field="Teacher.retirementDate"
            header="Ruhestandsdatum"
            data-type="date"
            style="min-width: 10rem"
        >
            <template #body="{ data }">
                {{ formatDate(data.Teacher?.retirementDate) }}
            </template>
            <template #editor="{ data, field }">
                <template v-if="data.Teacher">
                    <DatePicker
                        v-model="data.Teacher[field]"
                        time
                        date-format="dd.mm.yy"
                        placeholder="Ruhestandsdatum auswählen"
                    />
                </template>
                <template v-else> - </template>
            </template>
            <template #filter="{ filterModel, filterCallback }">
                <DatePicker
                    v-model="filterModel.value"
                    date-format="dd.mm.yy"
                    placeholder="Datum filtern"
                    @value-change="filterCallback()"
                />
            </template>
        </Column>

        <!-- Spalte: Erstellungsdatum -->
        <Column
            field="createdAt"
            header="Erstellt am"
            data-type="date"
            style="min-width: 12rem"
        >
            <template #body="{ data }">
                {{ formatDate(data.createdAt) }}
            </template>
            <template #filter="{ filterModel, filterCallback }">
                <DatePicker
                    v-model="filterModel.value"
                    date-format="dd.mm.yy"
                    placeholder="Datum filtern"
                    @value-change="filterCallback()"
                />
            </template>
        </Column>

        <!-- Spalte: Aktualisierungsdatum -->
        <Column
            field="updatedAt"
            header="Aktualisiert am"
            data-type="date"
            style="min-width: 12rem"
        >
            <template #body="{ data }">
                {{ formatDate(data.updatedAt) }}
            </template>
            <template #filter="{ filterModel, filterCallback }">
                <DatePicker
                    v-model="filterModel.value"
                    date-format="dd.mm.yy"
                    placeholder="Datum filtern"
                    @value-change="filterCallback()"
                />
            </template>
        </Column>

        <!-- Spalte für den Zeileneditor -->
        <Column
            :rowEditor="true"
            style="width: 10%; min-width: 8rem"
            bodyStyle="text-align:center"
        ></Column>
    </DataTable>
</template>
