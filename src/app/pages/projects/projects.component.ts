import { AfterViewInit, Component, Inject, Renderer2, ViewChild, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { ProjectService } from "../../services/project.service";
import { FormGroup, FormBuilder } from '@angular/forms';
import { Project } from "../../models/project.model";
import { Filters } from "../../models/filters.model";
import { MatPaginator } from '@angular/material/paginator';
import { Router, ActivatedRoute } from '@angular/router';
import { DatePipe, DOCUMENT } from "@angular/common";
import { FilterService } from "../../services/filter.service";
import { ProjectList } from "../../models/project-list.model";
import { FiltersApi } from "../../models/filters-api.model";
import { environment } from "../../../environments/environment";
import { MapComponent } from 'src/app/components/kohesio/map/map.component';
import { MediaMatcher} from '@angular/cdk/layout';
declare let L:any;
declare let ECL:any;

@Component({
    templateUrl: './projects.component.html',
    styleUrls: ['./projects.component.scss']
})
export class ProjectsComponent implements AfterViewInit, OnDestroy {

    public projects!: Project[];
    public assets: any[] = [];
    public assetsCount = 0;
    public filters: FiltersApi;
    public count = 0;
    public myForm!: FormGroup;
    public isLoading = false;
    public isResultsTab = true;
    public isMapTab = false;
    public isAudioVisualTab = false;
    @ViewChild("paginatorTop") paginatorTop!: MatPaginator;
    @ViewChild("paginatorDown") paginatorDown!: MatPaginator;
    @ViewChild("paginatorAssets") paginatorAssets!: MatPaginator;
    @ViewChild(MapComponent) map!: MapComponent;
    public selectedTabIndex: number = 0;
    public selectedTab: string = 'results';
    public modalImageUrl = "";
    public modalImageTitle:string = "";
    public modalTitleLabel = "";
    public advancedFilterExpanded = false;
    public mapIsLoaded = false;
    public lastFiltersSearch: any;
    public entityURL = environment.entityURL;
    public pageSize = 15;

    public policyToThemes = {
        Q2547985: ["Q236689", "Q236690", "Q236691"],    //Smart-Europe
        Q2547987: ["Q236692", "Q236693", "Q236694"],    //Green and Carbon free Europe
        Q2547988: ["Q236696", "Q236697", "Q236698"],    //Social Europe
        Q2577335: ["Q236695"],                          //Connected Europe
        Q2577336: ["Q236699"],                          //Europe closer to citizens
        Q2577337: ["Q2577338"],                         //Technical Assistance
    }

    public themeSelection = []

    public semanticTerms: String[] = [];

    public mobileQuery: MediaQueryList;
    private _mobileQueryListener: () => void;

    constructor(private projectService: ProjectService,
        public filterService: FilterService,
        private formBuilder: FormBuilder,
        private _route: ActivatedRoute,
        private _router: Router,
        private _renderer2: Renderer2,
        @Inject(DOCUMENT) private _document: Document,
        private datePipe: DatePipe,
        private changeDetectorRef: ChangeDetectorRef,
        private media: MediaMatcher) {

        this.filters = this._route.snapshot.data['filters'];
        this.mobileQuery = media.matchMedia('(max-width: 768px)');
        this._mobileQueryListener = () => changeDetectorRef.detectChanges();
        this.mobileQuery.addListener(this._mobileQueryListener);
    }


    ngOnInit() {
        this.myForm = this.formBuilder.group({
            keywords: this._route.snapshot.queryParamMap.get('keywords'),
            country: [this.getFilterKey("countries", "country")],
            region: [],
            policyObjective: [this.getFilterKey("policy_objective", "policyObjective")],
            theme: [this.getFilterKey("thematic_objectives", "theme")],
            //Advanced filters
            programPeriod: [this.getFilterKey("programmingPeriods", "programPeriod")],
            fund: [this.getFilterKey("funds", "fund")],
            program: [],
            interventionField: [this.getFilterKey("categoriesOfIntervention", "interventionField")],
            totalProjectBudget: [this.getFilterKey("totalProjectBudget", "totalProjectBudget")],
            amountEUSupport: [this.getFilterKey("amountEUSupport", "amountEUSupport")],
            projectStart: [this.getDate(this._route.snapshot.queryParamMap.get('projectStart'))],
            projectEnd: [this.getDate(this._route.snapshot.queryParamMap.get('projectEnd'))],
            sort: [this.getFilterKey("sort", "sort")]
        });

        this.advancedFilterExpanded = this.myForm.value.programPeriod || this.myForm.value.fund ||
            this._route.snapshot.queryParamMap.get('program') ||
            this.myForm.value.interventionField || this.myForm.value.totalProjectBudget ||
            this.myForm.value.amountEUSupport || this.myForm.value.projectStart || this.myForm.value.projectEnd;

        if (this._route.snapshot.queryParamMap.get('country')) {
            Promise.all([this.getRegions(), this.getPrograms()]).then(results => {
                if (this._route.snapshot.queryParamMap.get('region')) {
                    this.myForm.patchValue({
                        region: this.getFilterKey("regions", "region")
                    });
                }
                if (this._route.snapshot.queryParamMap.get('program')) {
                    this.myForm.patchValue({
                        program: this.getFilterKey("programs", "program")
                    });
                }
                if (this._route.snapshot.queryParamMap.get('region') ||
                    this._route.snapshot.queryParamMap.get('program')) {
                    this.getProjectList();
                }
            });
        }

        if (!this._route.snapshot.queryParamMap.get('region') &&
            !this._route.snapshot.queryParamMap.get('program')) {
            this.getProjectList();
        }
        this.onThemeChange();
        this.getThemes();

        
    }

    private getFilterKey(type: string, queryParam: string) {
        return this.filterService.getFilterKey(type, this._route.snapshot.queryParamMap.get(queryParam))
    }

    private getFilterLabel(type: string, label: string) {
        return this.filterService.getFilterLabel(type, label)
    }

    ngAfterViewInit(): void {
        if (this._route.snapshot.queryParamMap.has('tab')) {
            const tabParam = this._route.snapshot.queryParamMap.get('tab');
             if (tabParam=="audiovisual"){
                this.selectedTabIndex = 1;
             }else if (tabParam=="map"){
                this.selectedTabIndex = 2;
             }
        }
        if (this._route.snapshot.queryParamMap.has('page')){
            const pageParam:string | null= this._route.snapshot.queryParamMap.get('page');
            if (pageParam){
                this.paginatorTop.pageIndex = parseInt(pageParam) - 1;
                this.paginatorDown.pageIndex = parseInt(pageParam) - 1;
            }
        }
    }

    getThemes() {
        const policy = this.myForm.value.policyObjective;
        if (policy == null) {
            this.themeSelection = this.filters.thematic_objectives
        } else {
            // TODO ECL side effect
            //this.themeSelection = this.filters.thematic_objectives.filter((theme) => this.policyToThemes[policy].includes(theme["id"]))
        }
    }

    private getProjectList() {

        //Hack to program period for projects 2021-2027
        if (this.myForm.value.programPeriod == "2021-2027") {
            this.projects = [];
            this.map.loadMapRegion(new Filters());
            return;
        }

        let initialPageIndex = this.paginatorTop ? this.paginatorTop.pageIndex : 0;
        if (this._route.snapshot.queryParamMap.has('page') && !this.paginatorTop){
            const pageParam:string | null= this._route.snapshot.queryParamMap.get('page');
            if (pageParam){
                const pageIndex = parseInt(pageParam) - 1;
                initialPageIndex = pageIndex;
            }
        }
        this.isLoading = true;
        let offset = initialPageIndex * this.pageSize;
        this.projectService.getProjects(this.getFilters(), offset).subscribe((result: ProjectList | null) => {
            if (result != null){
                this.projects = result.list;
                this.count = result.numberResults;
                this.semanticTerms = result.similarWords;
            }
            this.isLoading = false;

            //go to the top
            document.body.scrollTop = 0;
            document.documentElement.scrollTop = 0;

            if (this.selectedTabIndex == 2) {
                this.map.loadMapRegion(this.lastFiltersSearch);
            } else {
                this.mapIsLoaded = false;
            }
        });
        let offsetAssets = this.paginatorAssets ? (this.paginatorAssets.pageIndex * this.paginatorAssets.pageSize) : 0;
        this.projectService.getAssets(this.getFilters(), offsetAssets).subscribe(result => {
            this.assets = result.list;
            this.assetsCount = result.numberResults;
        });
    }

    onSubmit() {
        if (!this.myForm.value.sort) {
            this.myForm.patchValue({
                sort: "orderTotalBudget-false"
            });
        }
        this.projects = [];
        if (this.paginatorTop.pageIndex == 0) {
            this.getProjectList();
        } else {
            this.goFirstPage();
        }

        this._router.navigate([], {
            relativeTo: this._route,
            queryParams: this.generateQueryParams(),
            queryParamsHandling: 'merge'
        });
    }

    onPaginate(event: any) {

        this.paginatorTop.pageIndex = event.pageIndex;
        this.paginatorDown.pageIndex = event.pageIndex;

        this._router.navigate([], {
            relativeTo: this._route,
            queryParams: {
                page: event.pageIndex != 0 ? event.pageIndex + 1 : null,
            },
            queryParamsHandling: 'merge',
        });

        this.getProjectList();
    }


    onPaginateAssets(event: any) {
        this.getProjectList();
    }

    goFirstPage() {
        this.paginatorDown.firstPage();
        this.paginatorTop.firstPage();
        this.paginatorAssets.firstPage();
    }

    generateQueryParams() {
        return {
            keywords: this.myForm.value.keywords ? this.myForm.value.keywords : null,
            country: this.getFilterLabel("countries", this.myForm.value.country),
            region: this.getFilterLabel("regions", this.myForm.value.region),
            theme: this.getFilterLabel("thematic_objectives", this.myForm.value.theme),
            policyObjective: this.getFilterLabel("policy_objective", this.myForm.value.policyObjective),
            programPeriod: this.getFilterLabel("programmingPeriods", this.myForm.value.programPeriod),
            fund: this.getFilterLabel("funds", this.myForm.value.fund),
            program: this.getFilterLabel("programs", this.myForm.value.program),
            interventionField: this.getFilterLabel("categoriesOfIntervention", this.myForm.value.interventionField),
            totalProjectBudget: this.getFilterLabel("totalProjectBudget", this.myForm.value.totalProjectBudget),
            amountEUSupport: this.getFilterLabel("amountEUSupport", this.myForm.value.amountEUSupport),
            projectStart: this.myForm.value.projectStart ? this.datePipe.transform(this.myForm.value.projectStart, 'dd-MM-yyyy') : null,
            projectEnd: this.myForm.value.projectEnd ? this.datePipe.transform(this.myForm.value.projectEnd, 'dd-MM-yyyy') : null,
            sort: this.getFilterLabel("sort", this.myForm.value.sort ? this.myForm.value.sort : "orderTotalBudget-false")
        }
    }

    onCountryChange() {
        if (this.myForm.value.country != null) {
            this.getRegions().then();
            this.getPrograms().then();
        }
        this.myForm.patchValue({
            region: null,
            program: null
        });
    }

    onPolicyObjectivesChange() {
        this.getThemes();
        this.myForm.patchValue({
            theme: null
        });
    }

    onThemeChange() {
        const theme = this.myForm.value.theme
        for (const policy in this.policyToThemes) {
            // TODO ECL side effect
            /*if (this.policyToThemes[policy].includes(theme)) {
                this.myForm.patchValue({
                    policyObjective: policy
                });
            }*/
        }
    }

    getRegions(): Promise<any> {
        return new Promise((resolve, reject) => {
            this.filterService.getRegions(this.myForm.value.country).subscribe(regions => {
                resolve(true);
            });
        });
    }

    getPrograms(): Promise<any> {
        return new Promise((resolve, reject) => {
            const country = environment.entityURL + this.myForm.value.country;
            this.filterService.getFilter("programs", { country: country }).subscribe(result => {
                this.filterService.filters.programs = result.programs;
                this.filters.programs = result.programs;
                resolve(true);
            });
        });
    }

    onTabSelected(index:any) {
        this.isAudioVisualTab = false;
        this.isMapTab = false;
        this.isResultsTab = false;
        this.selectedTabIndex = index;
        switch (index) {
            case 0: //Results
                this.isResultsTab = true;
                this.selectedTab = 'results';
                break;
            case 1: //Audio-visual
                this.isAudioVisualTab = true;
                this.selectedTab = 'audiovisual';
                break;
            case 2: //Map
                if (!this.mapIsLoaded) {
                    this.mapIsLoaded = true;
                    setTimeout(
                        () => {
                            this.map.refreshView();
                            this.map.loadMapRegion(this.lastFiltersSearch);
                        }, 500);
                }
                this.isMapTab = true;
                this.selectedTab = 'map';
                break;
        }
        this._router.navigate([], {
            relativeTo: this._route,
            queryParams: { 'tab': this.isResultsTab ? null : this.selectedTab },
            queryParamsHandling: 'merge'
        });

    }

    getFilters() {
        const formValues = Object.assign({}, this.myForm.value);
        formValues.projectStart = formValues.projectStart ? this.datePipe.transform(formValues.projectStart, 'yyyy-MM-dd') : undefined;
        formValues.projectEnd = formValues.projectEnd ? this.datePipe.transform(formValues.projectEnd, 'yyyy-MM-dd') : undefined;
        this.lastFiltersSearch = new Filters().deserialize(formValues);
        return this.lastFiltersSearch;
    }

    openImageOverlay(imgUrl:string, projectTitle:string, imageCopyright: string[] | undefined) {
        this.modalImageUrl = imgUrl;
        this.modalTitleLabel = projectTitle;
        if (imageCopyright && imageCopyright.length) {
            // TODO ECL side effect
            //this.modalImageTitle = imageCopyright[0];
        }
        // TODO ECL side effect
        //this.uxService.openModal("imageOverlay")
    }

    getDate(dateStringFormat: any) {
        if (dateStringFormat) {
            const dateSplit = dateStringFormat.split('-');
            const javascriptFormat = dateSplit[1] + "/" + dateSplit[0] + "/" + dateSplit[2];
            return dateStringFormat ? new Date(
                javascriptFormat
            ) : undefined;
        }
        return undefined;
    }

    resetForm() {
        this.myForm.reset();
    }

    onSortChange() {
        if (!this.myForm.value.sort) {
            this.myForm.value.sort = "relevance"
        }
        this.onSubmit();
    }

    onRestrictSearch(event: any) {
        if (this.semanticTerms && this.semanticTerms.length) {
            const keywordsValue = "\"" + this.myForm.value.keywords + "\"";
            this.myForm.patchValue({ "keywords": keywordsValue });
            this.semanticTerms = [];
            this.onSubmit();
        }
    }

    ngOnDestroy(): void {
        this.mobileQuery.removeListener(this._mobileQueryListener);
    }

}