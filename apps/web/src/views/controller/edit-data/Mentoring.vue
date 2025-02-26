<script setup lang="ts">
import { FilterMatchMode } from '@primevue/core/api'
import { onBeforeMount, ref } from 'vue'
import SupervisionService from '@/service/supervision.service'
import {
    ISupervisionResponse,
    ICreateSupervisionRequest,
} from '@workspace/shared'
import SupervisionTypeService from '@/service/supervisionType.service'
import SemesterService from '@/service/semester.service'
import TeacherService from '@/service/teacher.service'
import CommentService from '@/service/comment.service'
import {
    ISupervisionTypeResponse,
    ISemesterResponse,
    ITeacherResponse,
    ICommentResponse,
} from '@workspace/shared'
import {
    DataTableFilterMeta,
    DataTableRowEditSaveEvent,
    useToast,
} from 'primevue'
import { getFormStatesAsType } from '@/helpers/functions'
import { z } from 'zod'
import { zodResolver } from '@primevue/forms/resolvers/zod'
import { Form, FormSubmitEvent } from '@primevue/forms'

interface SelectOption {
    label: string
    value: number
}

const supervisions = ref<ISupervisionResponse[]>([])
const filters = ref<DataTableFilterMeta>({})
const editingRows = ref([])
const loading = ref(false)
const toast = useToast()
const typeSelect = ref<SelectOption[]>([])
const semesterSelect = ref<SelectOption[]>([])
const userSelect = ref<SelectOption[]>([])
const expandedRowGroups = ref<number[]>([])

const updateSupervisions = (data: ISupervisionResponse[]) => {
    supervisions.value = data.sort((a, b) => a.teacherId - b.teacherId)
}

/**
 * New Supervision Configuration
 */
const newSupervisionSubmitted = ref(false)
const newSupervisionDialog = ref(false)
const newSupervisionSchema = z.object({
    studentId: z.number(),
    //must match a valid id from semesterSelect
    semesterPeriodId: z
        .number()
        .refine((value) => semesterSelect.value.some((s) => s.value === value)),
    supervisionTypeId: z
        .number()
        .refine((value) => typeSelect.value.some((s) => s.value === value)),
    teacherId: z
        .number()
        .refine((value) => userSelect.value.some((s) => s.value === value)),
    commentId: z.number(),
    supervisionShare: z.number(),
})
const resolver = ref(zodResolver(newSupervisionSchema))
const currentCommentContent = ref('')
const currentCommentDate = ref('')
const commentDrawerVisible = ref(false)

const openNew = () => {
    newSupervisionSubmitted.value = false
    newSupervisionDialog.value = true
}

const hideDialog = () => {
    newSupervisionDialog.value = false
    newSupervisionSubmitted.value = false
}

const deleteEntry = (id: number) => {
    try {
        SupervisionService.deleteSupervision(id)

        toast.add({
            severity: 'success',
            summary: 'Erfolgreich',
            detail: 'Betreuung gelöscht',
            life: 3000,
        })

        supervisions.value = supervisions.value.filter(
            (event) => event.id !== id
        )
    } catch (error) {
        toast.add({
            severity: 'error',
            summary: 'Fehler',
            detail: error,
            life: 5000,
        })
    }
}

const getNewSupervisionValues = (): z.infer<typeof newSupervisionSchema> => {
    return {
        studentId: 0,
        semesterPeriodId: 0,
        supervisionTypeId: 0,
        teacherId: 0,
        commentId: 0,
        supervisionShare: 0,
    } satisfies ICreateSupervisionRequest
}

const onCreateSupervisionFormSubmit = async ({
    valid,
    states,
}: FormSubmitEvent) => {
    if (valid) {
        newSupervisionSubmitted.value = true
        const newSupervision =
            getFormStatesAsType<ICreateSupervisionRequest>(states)
        // newSupervision.programId = null
        SupervisionService.createSupervision(newSupervision).then((res) => {
            const { data, error } = res
            if (error) {
                toast.add({
                    severity: 'error',
                    summary: 'Fehler',
                    detail: error,
                    life: 5000,
                })
            } else {
                updateSupervisions([...supervisions.value, data])
                toast.add({
                    severity: 'success',
                    summary: 'Erfolgreich',
                    detail: 'Betreuung erstellt',
                    life: 3000,
                })
            }
        })

        newSupervisionDialog.value = false
    }
}

const onRowEditSave = ({ newData }: DataTableRowEditSaveEvent) => {
    SupervisionService.updateSupervision(newData).then((res) => {
        const { data, error } = res
        if (error) {
            toast.add({
                severity: 'error',
                summary: 'Fehler',
                detail: error,
                life: 5000,
            })
        } else {
            updateSupervisions(
                supervisions.value.map((u) => (u.id === data.id ? data : u))
            )
            toast.add({
                severity: 'success',
                summary: 'Erfolgreich',
                detail: 'Betreuung aktualisiert',
                life: 3000,
            })
        }
    })
}

onBeforeMount(() => {
    loading.value = true
    SupervisionService.getSupervisions().then((res) => {
        const { data, error } = res
        if (error) {
            toast.add({
                severity: 'error',
                summary: 'Fehler',
                detail: error,
                life: 5000,
            })
        } else {
            updateSupervisions(data)
        }
    })

    SupervisionTypeService.getSupervisionTypes().then((res) => {
        const { data, error } = res
        if (error) {
            console.warn('[Mentoring-Overview] Couldn`t load supervisionTypes')
        } else {
            typeSelect.value = data.map(
                (supervisionType: ISupervisionTypeResponse) => ({
                    label: supervisionType.typeOfSupervision,
                    value: supervisionType.typeOfSupervisionId,
                })
            )
        }
    })

    SemesterService.getSemesters().then((res) => {
        const { data, error } = res
        if (error) {
            console.warn('[Mentoring-Overview] Couldn`t load semster')
        } else {
            semesterSelect.value = data.map((semester: ISemesterResponse) => ({
                label: semester.name,
                value: semester.id,
            }))
        }
    })

    TeacherService.getTeachers().then((res) => {
        const { data, error } = res
        if (error) {
            console.warn('[Mentoring-Overview] Couldn`t load teachers')
        } else {
            userSelect.value = data.map((teacher: ITeacherResponse) => ({
                label: teacher.user.firstName + ' ' + teacher.user.lastName,
                value: teacher.id,
            }))
        }
    })

    initFilters()
    loading.value = false
})

// Initialize filters
function initFilters() {
    filters.value = {
        global: {
            value: null,
            matchMode: FilterMatchMode.CONTAINS,
        },
        name: {
            value: null,
            matchMode: FilterMatchMode.STARTS_WITH,
        },
    }
}

const showComment = async (commentId: number) => {
    const commentData = await fetchCommentById(commentId)
    currentCommentContent.value = commentData
        ? commentData.commentContent
        : 'Kein Inhalt.'
    currentCommentDate.value = commentData
        ? formatDate(commentData.commentDate.toString())
        : 'Kein Datum.'
    commentDrawerVisible.value = true
}

const fetchCommentById = async (
    commentId: number
): Promise<ICommentResponse | null> => {
    try {
        const res = await CommentService.getComments()
        const { data, error } = res

        if (error) {
            console.log('Error Laden von Comments')
            return null
        }

        const response = data.find((item) => item.commentId === commentId)
        return response || null
    } catch (e) {
        console.error('Ein Fehler ist aufgetreten:', e)
        return null
    }
}

const closeCommentDrawer = () => {
    commentDrawerVisible.value = false
    currentCommentContent.value = ''
    currentCommentDate.value = ''
}

const formatDate = (value: string) => {
    if (!value) return ''
    const date = new Date(value)
    const day = String(date.getDate()).padStart(2, '0')
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const year = date.getFullYear()
    return `${day}.${month}.${year}`
}

//convert semester ID into Name
const getSemesterName = (id: number) => {
    const semester = semesterSelect.value.find((s) => s.value === id)
    return semester ? semester.label : 'Unbekannt'
}

const getUserName = (id: number) => {
    const user = userSelect.value.find((s) => s.value === id)
    return user ? user.label : 'Unbekannt'
}

const getTypeName = (id: number) => {
    const type = typeSelect.value.find((s) => s.value === id)
    return type ? type.label : 'Unbekannt'
}

// formats numbers with one decimal place
const formatNumber = (value: number) => {
    if (value == null) return '/' // Leere Anzeige, falls der Wert null oder undefined ist
    return value.toLocaleString('de-DE', {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
    })
}
</script>

<template>
    <div class="card">
        <div class="mb-4 flex justify-between">
            <h1 class="mb-4 text-xl font-semibold">
                Übersicht der Betreuungen
            </h1>
            <Button
                label="Neue Betreuung"
                icon="pi pi-plus"
                class="mr-2"
                @click="openNew"
            />
        </div>

        <DataTable
            :value="supervisions"
            size="small"
            data-key="id"
            showGridlines
            scrollable
            scrollHeight="70vh"
            v-model:expandedRowGroups="expandedRowGroups"
            expandableRowGroups
            rowGroupMode="subheader"
            groupRowsBy="teacherId"
            :row-hover="true"
            :loading="loading"
            v-model:filters="filters"
            :global-filter-fields="['studentId']"
            v-model:editing-rows="editingRows"
            editMode="row"
            @row-edit-save="onRowEditSave"
        >
            <!-- Table Header -->
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
                        <!-- @vue-ignore -->
                        <InputText
                            v-model="filters['global'].value"
                            placeholder="Matrikelnummer-Suche"
                        />
                    </div>
                </div>
            </template>

            <!-- Empty Table State -->
            <template #empty>Keine Betreuungen gefunden.</template>

            <!-- Group Header -->
            <template #groupheader="{ data }">
                <span class="ml-2 align-middle font-bold leading-normal">{{
                    getUserName(data.teacherId)
                }}</span>
            </template>

            <!-- ID Column -->
            <Column field="id" header="ID" style="min-width: 1rem" sortable>
                <template #body="{ data }">{{ data.id }}</template>
            </Column>

            <!-- SupervisionType Column -->
            <Column
                field="supervisionTypeId"
                header="Art der Betreuung"
                style="min-width: 8rem"
                sortable
            >
                <template #body="{ data }">{{
                    getTypeName(data.supervisionTypeId)
                }}</template>
                <template #editor="{ data, field }">
                    <Select
                        v-model="data[field]"
                        :options="typeSelect"
                        option-label="label"
                        option-value="value"
                        fluid
                    />
                </template>
            </Column>

            <!-- SupervisionShare Column -->
            <Column
                field="supervisionShare"
                header="Anteil"
                style="min-width: 4rem"
            >
                <template #body="{ data }"
                    >{{ formatNumber(data.supervisionShare) }} %</template
                >
                <template #editor="{ data, field }">
                    <InputNumber
                        v-model="data[field]"
                        fluid
                        :useGrouping="false"
                        :min="0"
                        :max="100"
                        :step="1"
                        :min-fraction-digits="2"
                        :max-fraction-digits="2"
                        :show-buttons="true"
                    />
                </template>
            </Column>

            <!-- Matricelnumber Column -->
            <Column
                field="studentId"
                header="Matrikelnummer"
                style="min-width: 6rem"
            >
                <template #body="{ data }">{{ data.studentId }}</template>
                <template #editor="{ data, field }">
                    <InputNumber
                        v-model="data[field]"
                        fluid
                        :useGrouping="false"
                        :min="0"
                        :min-fraction-digits="0"
                        :max-fraction-digits="0"
                        :show-buttons="true"
                    />
                </template>
            </Column>

            <!-- Semester Column -->
            <Column
                field="semesterPeriodId"
                header="Semester"
                style="min-width: 8rem"
                sortable
            >
                <template #body="{ data }">{{
                    getSemesterName(data.semesterPeriodId)
                }}</template>
                <template #editor="{ data, field }">
                    <Select
                        v-model="data[field]"
                        :options="semesterSelect"
                        option-label="label"
                        option-value="value"
                        fluid
                    />
                </template>
            </Column>

            <Column
                :rowEditor="true"
                style="width: 10%; min-width: 8rem"
                bodyStyle="text-align:center"
            ></Column>

            <Column
                style="width: 4rem; text-align: center"
                :headerStyle="{ textAlign: 'center' }"
            >
                <template #body="{ data }">
                    <Button
                        v-if="data.commentId > 0"
                        icon="pi pi-comments"
                        class="p-button-secondary"
                        @click="showComment(data.commentId)"
                    />
                </template>
            </Column>

            <Column
                style="width: 4rem; text-align: center"
                :headerStyle="{ textAlign: 'center' }"
            >
                <template #body="{ data }">
                    <Button
                        icon="pi pi-trash"
                        class="p-button-rounded p-button-danger"
                        @click="deleteEntry(data.id)"
                    />
                </template>
            </Column>
        </DataTable>

        <Drawer
            v-model:visible="commentDrawerVisible"
            header="Kommentar"
            position="right"
        >
            <div class="flex flex-col flex-wrap gap-4">
                <p>Kommentar vom: {{ currentCommentDate }}</p>
                <Textarea
                    v-model="currentCommentContent"
                    id="comment"
                    rows="8"
                    readonly
                />
                <Button
                    label="Schließen"
                    class="p-button-secondary"
                    icon="pi pi-times"
                    @click="closeCommentDrawer"
                />
            </div>
        </Drawer>

        <Dialog
            v-model:visible="newSupervisionDialog"
            :style="{ width: '450px' }"
            header="Neue Betreuung"
            :modal="true"
        >
            <!-- Form inside the dialog -->
            <Form
                v-slot="$form"
                :resolver
                :initial-values="getNewSupervisionValues()"
                class="flex w-full flex-col gap-4"
                @submit="onCreateSupervisionFormSubmit"
            >
                <!-- SupervisionType Field -->
                <div class="mt-2 flex flex-col gap-1">
                    <FloatLabel variant="on">
                        <Select
                            label-id="supervisionTypeId"
                            name="supervisionTypeId"
                            :options="typeSelect"
                            option-label="label"
                            option-value="value"
                            fluid
                        ></Select>
                        <label
                            for="supervisionTypeId"
                            class="mb-2 block text-lg font-medium text-surface-900 dark:text-surface-0"
                            >Art der Betreuung</label
                        >
                    </FloatLabel>
                    <!-- @vue-expect-error -->
                    <Message
                        v-if="$form.supervisionTypeId?.invalid"
                        severity="error"
                        size="small"
                        variant="simple"
                    >
                        <!-- @vue-expect-error -->
                        {{ $form.supervisionTypeId.error?.message }}
                    </Message>
                </div>

                <!-- Matricelnumber Field -->
                <div class="flex flex-col gap-1">
                    <FloatLabel variant="on">
                        <InputNumber
                            id="studentId"
                            name="studentId"
                            :useGrouping="false"
                            :min="0"
                            :min-fraction-digits="0"
                            :max-fraction-digits="0"
                            :show-buttons="true"
                            fluid
                        />
                        <label
                            for="studentId"
                            class="mb-2 block text-lg font-medium text-surface-900 dark:text-surface-0"
                            >Matrikelnummer</label
                        >
                    </FloatLabel>
                    <!-- @vue-expect-error -->
                    <Message
                        v-if="$form.studentId?.invalid"
                        severity="error"
                        size="small"
                        variant="simple"
                    >
                        <!-- @vue-expect-error -->
                        {{ $form.studentId.error?.message }}
                    </Message>
                </div>

                <!-- SupervisionShare Field -->
                <div class="flex flex-col gap-1">
                    <FloatLabel variant="on">
                        <InputNumber
                            v-tooltip="'Nur relevant für Praxissemester!'"
                            id="supervisionShare"
                            name="supervisionShare"
                            :min="0"
                            :max="100"
                            :max-fraction-digits="2"
                            :step="1"
                            suffix=" %"
                            showButtons
                            fluid
                        />
                        <label
                            for="supervisionShare"
                            class="mb-2 block text-lg font-medium text-surface-900 dark:text-surface-0"
                            >Betreuungsanteil (in %)</label
                        >
                    </FloatLabel>
                    <!-- @vue-expect-error -->
                    <Message
                        v-if="$form.supervisionShare?.invalid"
                        severity="error"
                        size="small"
                        variant="simple"
                    >
                        <!-- @vue-expect-error -->
                        {{ $form.supervisionShare.error?.message }}
                    </Message>
                </div>

                <!-- Semester Field -->
                <div class="flex flex-col gap-1">
                    <FloatLabel variant="on">
                        <Select
                            label-id="semesterPeriodId"
                            name="semesterPeriodId"
                            :options="semesterSelect"
                            option-label="label"
                            option-value="value"
                            fluid
                        ></Select>
                        <label
                            for="semesterPeriodId"
                            class="mb-2 block text-lg font-medium text-surface-900 dark:text-surface-0"
                            >Semester</label
                        >
                    </FloatLabel>
                    <!-- @vue-expect-error -->
                    <Message
                        v-if="$form.semesterPeriodId?.invalid"
                        severity="error"
                        size="small"
                        variant="simple"
                    >
                        <!-- @vue-expect-error -->
                        {{ $form.semesterPeriodId.error?.message }}
                    </Message>
                </div>

                <!-- Teacher Field -->
                <div class="flex flex-col gap-1">
                    <FloatLabel variant="on">
                        <Select
                            label-id="teacherId"
                            name="teacherId"
                            :options="userSelect"
                            option-label="label"
                            option-value="value"
                            fluid
                        ></Select>
                        <label
                            for="teacherId"
                            class="mb-2 block text-lg font-medium text-surface-900 dark:text-surface-0"
                            >Lehrperson</label
                        >
                    </FloatLabel>
                    <!-- @vue-expect-error -->
                    <Message
                        v-if="$form.teacherId?.invalid"
                        severity="error"
                        size="small"
                        variant="simple"
                    >
                        <!-- @vue-expect-error -->
                        {{ $form.teacherId.error?.message }}
                    </Message>
                </div>

                <!-- Footer -->
                <div class="flex flex-row">
                    <Button
                        label="Abbrechen"
                        icon="pi pi-times"
                        text
                        @click="hideDialog"
                        fluid
                    />
                    <Button
                        type="submit"
                        icon="pi pi-check"
                        label="Erstellen"
                        fluid
                    />
                </div>
            </Form>
        </Dialog>
    </div>
</template>
