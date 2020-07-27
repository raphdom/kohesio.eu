import {AfterViewInit, Component, Inject, Renderer2, ViewChild} from '@angular/core';
import { UxService } from '@eui/core';
import {ProjectService} from "../../services/project.service";
import { FormGroup, FormBuilder } from '@angular/forms';
import {Project} from "../../shared/models/project.model";
import {Filters} from "../../shared/models/filters.model";
import {MarkerService} from "../../services/marker.service";
import { MatPaginator } from '@angular/material/paginator';
import { Router, ActivatedRoute } from '@angular/router';
import {DatePipe, DOCUMENT} from "@angular/common";
import {MapComponent} from "../../shared/components/map/map.component";
import {FilterService} from "../../services/filter.service";
import {ProjectList} from "../../shared/models/project-list.model";
import {FiltersApi} from "../../shared/models/filters-api.model";
import {environment} from "../../../environments/environment";
import {MapService} from "../../services/map.service";
declare let L;

@Component({
    templateUrl: './projects.component.html'
})
export class ProjectsComponent implements AfterViewInit {

    public projects: Project[] = [];
    public filters: FiltersApi;
    public count = 0;
    public myForm: FormGroup;
    public isLoading = false;
    public isMapTab = false;
    @ViewChild("paginatorTop") paginatorTop: MatPaginator;
    @ViewChild("paginatorDown") paginatorDown: MatPaginator;
    @ViewChild(MapComponent) map: MapComponent;
    public selectedTabIndex:number = 1;
    public modalImageUrl = "";
    public modalTitleLabel = "";
    public advancedFilterExpanded = false;
    public mapIsLoaded = false;
    public lastFiltersSearch;

    public mapRegions = [{
        label: "Europe",
        region: undefined,
        bounds: L.latLngBounds(L.latLng(67.37369797436554, 39.46330029192563), L.latLng(33.063924198120645, -17.13826220807438))
    }];
    public countriesBoundaries = {
        Q20 : L.latLngBounds(L.latLng(51.138001488062564, 10.153629941986903), L.latLng(41.29431726315258, -5.051448183013119)), //France
        Q15 : L.latLngBounds(L.latLng(47.11499982620772, 19.840596320855976), L.latLng(36.50963615733049, 4.152119758355975)),      //Italy
        Q13 : L.latLngBounds(L.latLng(56.75272287205736, 25.68595317276812), L.latLng(48.07807894349862, 12.89786723526812)),  //Poland
        Q25 : L.latLngBounds(L.latLng(51.70660846336452, 19.33647915386496), L.latLng(47.06263847995432, 11.73394009136496)),  //Czech Republic
        Q2  : L.latLngBounds(L.latLng(55.51619215717891, -4.843840018594397), L.latLng(51.26191485308451, -11.237882987344397)),  //Ireland
        Q12 : L.latLngBounds(L.latLng(58.048818457936505, 15.492176077966223), L.latLng(54.06583577161281, 7.647937796716221)), //Denmark
    };

    constructor(private projectService: ProjectService,
                private filterService: FilterService,
                private mapService: MapService,
                private formBuilder: FormBuilder,
                private uxService:UxService,
                private markerService:MarkerService,
                private _route: ActivatedRoute,
                private _router: Router,
                private _renderer2: Renderer2,
                @Inject(DOCUMENT) private _document: Document,
                private datePipe: DatePipe){}

    ngOnInit(){
        this.filters = this._route.snapshot.data.filters;

        this.myForm = this.formBuilder.group({
            keywords: this._route.snapshot.queryParamMap.get('keywords'),
            country: [this.getFilterKey("countries","country")],
            region: [],
            policyObjective: [this.getFilterKey("policy_objective","policyObjective")],
            theme: [this.getFilterKey("thematic_objectives","theme")],
            //Advanced filters
            programPeriod: [this.getFilterKey("programmingPeriods","programPeriod")],
            fund:[this.getFilterKey("funds","fund")],
            program:[],
            categoryOfIntervention:[this.getFilterKey("categoriesOfIntervention","categoryOfIntervention")],
            totalProjectBudget:[this.getFilterKey("totalProjectBudget","totalProjectBudget")],
            amountEUSupport:[this.getFilterKey("amountEUSupport","amountEUSupport")],
            projectStart: [this.getDate(this._route.snapshot.queryParamMap.get('projectStart'))],
            projectEnd: [this.getDate(this._route.snapshot.queryParamMap.get('projectEnd'))]
        });

        this.advancedFilterExpanded = this.myForm.value.programPeriod || this.myForm.value.fund ||
            this._route.snapshot.queryParamMap.get('program') ||
            this.myForm.value.categoryOfIntervention || this.myForm.value.totalProjectBudget ||
            this.myForm.value.amountEUSupport || this.myForm.value.projectStart || this.myForm.value.projectEnd;

        if (this._route.snapshot.queryParamMap.get('country')){
            Promise.all([this.getRegions(), this.getPrograms()]).then(results=>{
                if (this._route.snapshot.queryParamMap.get('region')) {
                    this.myForm.patchValue({
                        region: this.getFilterKey("regions","region")
                    });
                }
                if (this._route.snapshot.queryParamMap.get('program')) {
                    this.myForm.patchValue({
                        program: this.getFilterKey("programs","program")
                    });
                }
                if(this._route.snapshot.queryParamMap.get('region') ||
                    this._route.snapshot.queryParamMap.get('program')) {
                    this.getProjectList();
                }
            });
        }

        if (!this._route.snapshot.queryParamMap.get('region') &&
            !this._route.snapshot.queryParamMap.get('program')) {
            this.getProjectList();
        }

    }

    private getFilterKey(type: string, queryParam: string){
        return this.filterService.getFilterKey(type,this._route.snapshot.queryParamMap.get(queryParam))
    }

    private getFilterLabel(type: string, label: string){
        return this.filterService.getFilterLabel(type,label)
    }

    ngAfterViewInit(): void {

    }

    private getProjectList(){

        //Hack to program period for projects 2021-2027
        if (this.myForm.value.programPeriod == "2021-2027") {
            this.projects = [];
            this.loadMapRegion();
            return;
        }

        this.isLoading = true;
        let offset = this.paginatorTop.pageIndex * this.paginatorTop.pageSize | 0;
        this.projectService.getProjects(this.getFilters(), offset, this.paginatorTop.pageSize).subscribe((result:ProjectList) => {
            this.projects = result.list;
            this.count = result.numberResults;
            this.isLoading = false;

            //go to the top
            document.body.scrollTop = 0;
            document.documentElement.scrollTop = 0;

            this.mapRegions = this.mapRegions.slice(0,1);

            //this.goFirstPage();
            if (this.selectedTabIndex == 3){
                let granularityRegion = undefined;
                if (this.myForm.value.country){
                    granularityRegion = environment.entityURL + this.myForm.value.country;
                    this.mapRegions.push({
                        label: this.getFilterLabel("countries", this.myForm.value.country),
                        region: granularityRegion,
                        bounds: this.countriesBoundaries[this.myForm.value.country]
                    })
                }
                this.loadMapRegion(granularityRegion);
            }else{
                this.mapIsLoaded = false;
            }
        });
    }

    onSubmit() {
        this.projects = [];
        if (this.paginatorTop.pageIndex==0) {
            this.getProjectList();
        }else{
            this.goFirstPage();
        }

        this._router.navigate([], {
            relativeTo: this._route,
            queryParams: this.generateQueryParams(),
            queryParamsHandling: 'merge'
        });
    }

    onPaginate(event){
        this.paginatorTop.pageIndex = event.pageIndex;
        this.paginatorDown.pageIndex = event.pageIndex;
        this.getProjectList();
    }

    getPageIndexStart(){
        return this.paginatorTop ? this.paginatorTop.pageSize * this.paginatorTop.pageIndex : 0;
    }

    getPageIndexEnd(){
        return this.paginatorTop ? this.getPageIndexStart() + this.paginatorTop.pageSize : 15;
    }
    goFirstPage(){
        this.paginatorDown.firstPage();
        this.paginatorTop.firstPage();
    }

    generateQueryParams(){
        return {
            keywords: this.myForm.value.keywords ? this.myForm.value.keywords : null,
            country: this.getFilterLabel("countries", this.myForm.value.country),
            region: this.getFilterLabel("regions", this.myForm.value.region),
            theme: this.getFilterLabel("thematic_objectives", this.myForm.value.theme),
            policyObjective: this.getFilterLabel("policy_objective", this.myForm.value.policyObjective),
            programPeriod: this.getFilterLabel("programmingPeriods", this.myForm.value.programPeriod),
            fund: this.getFilterLabel("funds", this.myForm.value.fund),
            program: this.getFilterLabel("programs", this.myForm.value.program),
            categoryOfIntervention:this.getFilterLabel("categoriesOfIntervention", this.myForm.value.categoryOfIntervention),
            totalProjectBudget:this.getFilterLabel("totalProjectBudget", this.myForm.value.totalProjectBudget),
            amountEUSupport:this.getFilterLabel("amountEUSupport", this.myForm.value.amountEUSupport),
            projectStart: this.myForm.value.projectStart ? this.datePipe.transform(this.myForm.value.projectStart, 'dd-MM-yyyy') : null,
            projectEnd: this.myForm.value.projectEnd ? this.datePipe.transform(this.myForm.value.projectEnd, 'dd-MM-yyyy') : null
        }
    }

    onCountryChange(){
        this.getRegions().then();
        this.getPrograms().then();
        this.myForm.patchValue({
            region: null,
            program: null
        });
    }

    onPolicyObjectivesChange(){
        this.myForm.patchValue({
            theme: null
        });
    }

    onThemeChange(){
        this.myForm.patchValue({
            policyObjective: null
        });
    }

    getRegions(): Promise<any>{
        return new Promise((resolve, reject) => {
            this.filterService.getRegions(this.myForm.value.country).subscribe(regions => {
                resolve(true);
            });
        });
    }

    getPrograms(): Promise<any>{
        return new Promise((resolve, reject) => {
            const country = environment.entityURL + this.myForm.value.country;
            this.filterService.getFilter("programs",{country:country}).subscribe(result => {
                this.filterService.filters.programs = result.programs;
                this.filters.programs = result.programs;
                resolve(true);
            });
        });
    }

    onTabSelected(event){
        if(event.label == "Map"){
            if (!this.mapIsLoaded) {
                this.mapIsLoaded = true;
                this.map.refreshView();
                setTimeout(
                    () => {
                        let granularityRegion = undefined;
                        if (this.myForm.value.country){
                            granularityRegion = environment.entityURL + this.myForm.value.country;
                            this.mapRegions.push({
                                label: this.getFilterLabel("countries", this.myForm.value.country),
                                region: granularityRegion,
                                bounds: this.countriesBoundaries[this.myForm.value.country]
                            })
                        }
                        this.loadMapRegion(granularityRegion);
                    }, 500);
            }
            this.selectedTabIndex = event.index;
            this.isMapTab = true;
        }else{
            this.isMapTab = false;
        }
    }

    getFilters(){
        const formValues = Object.assign({},this.myForm.value);
        formValues.projectStart = formValues.projectStart ? this.datePipe.transform(formValues.projectStart, 'yyyy-MM-dd') : undefined;
        formValues.projectEnd = formValues.projectEnd ? this.datePipe.transform(formValues.projectEnd, 'yyyy-MM-dd') : undefined;
        this.lastFiltersSearch = new Filters().deserialize(formValues);
        return this.lastFiltersSearch;
    }

    loadMapRegion(granularityRegion?: string){

        const index = this.mapRegions.findIndex(x => x.region ===granularityRegion);
        if (this.mapRegions[index].bounds) {
            this.map.fitBounds(this.mapRegions[index].bounds);
        }
        this.mapRegions = this.mapRegions.slice(0,index+1);
        //Hack to program period for projects 2021-2027
        if (this.myForm.value.programPeriod == "2021-2027") {
            this.map.removeAllMarkers();
            this.map.cleanAllLayers();
        }else {
            this.loadMapVisualization(granularityRegion);
        }
    }

    loadMapVisualization(granularityRegion?: string){
        this.map.removeAllMarkers();
        this.map.cleanAllLayers();
        this.mapService.getMapInfo(this.lastFiltersSearch, granularityRegion).subscribe(data=>{
            if (data.list && data.list.length){
                if (data.geoJson) {
                    const featureCollection = {
                        "type": "FeatureCollection",
                        features: []
                    }
                    const validJSON = data.geoJson.replace(/'/g, '"');
                    featureCollection.features.push({
                        "type": "Feature",
                        "properties": null,
                        "geometry": JSON.parse(validJSON)
                    });
                    this.addFeatureCollectionLayer(featureCollection);
                }
                for(let project of data.list){
                    if (project.coordinates && project.coordinates.length) {
                        project.coordinates.forEach(coords=>{
                            const coordinates = coords.split(",");
                            const popupContent = "<a href='/projects/" + project.item +"'>"+project.labels[0]+"</a>";
                            this.map.addMarkerPopup(coordinates[1], coordinates[0], popupContent);
                        })
                    }
                }
            }else {
                data.forEach(region => {
                    const featureCollection = {
                        "type": "FeatureCollection",
                        features: []
                    }
                    const validJSON = region.geoJson.replace(/'/g, '"');
                    const countryProps = Object.assign({}, region);
                    delete countryProps.geoJson;
                    featureCollection.features.push({
                        "type": "Feature",
                        "properties": countryProps,
                        "geometry": JSON.parse(validJSON)
                    });
                    this.addFeatureCollectionLayer(featureCollection);
                })
            }
        });
    }

    addFeatureCollectionLayer(featureCollection){
        this.map.addLayer(featureCollection, (feature, layer) => {
            layer.on({
                click: (e) => {
                    const region = e.target.feature.properties.region;
                    const count = e.target.feature.properties.count;
                    const label = e.target.feature.properties.regionLabel;
                    if (count) {
                        let bounds = layer.getBounds();
                        const regionKey = region.replace(environment.entityURL, "");
                        if (this.countriesBoundaries[regionKey]){
                            bounds = this.countriesBoundaries[regionKey];
                        }
                        this.map.fitBounds(bounds);
                        this.loadMapVisualization(region);
                        this.mapRegions.push({
                            label: label,
                            region: region,
                            bounds: bounds
                        })
                    }
                },
                mouseover: (e) => {
                    const layer = e.target;
                    if (layer.feature.properties) {
                        layer.setStyle({
                            fillOpacity: 1
                        });
                    }
                },
                mouseout: (e) => {
                    const layer = e.target;
                    if (layer.feature.properties) {
                        layer.setStyle({
                            fillOpacity: 0.5
                        });
                    }
                },
            });
        }, (feature) => {
            let style = {
                color: "#ff7800",
                opacity: 1,
                weight: 2,
                fillOpacity: 0.5,
                fillColor: "#ff7800",
            }
            if (feature.properties && !feature.properties.count) {
                style.fillColor = "#AAAAAA";
            }
            return style;
        });
    }

    openImageOverlay(imgUrl, projectTitle){
        this.modalImageUrl = imgUrl;
        this.modalTitleLabel = projectTitle;
        this.uxService.openModal("imageOverlay")
    }

    getDate(dateStringFormat){
        if (dateStringFormat) {
            const dateSplit = dateStringFormat.split('-');
            const javascriptFormat = dateSplit[1] + "/" + dateSplit[0] + "/" + dateSplit[2];
            return dateStringFormat ? new Date(
                javascriptFormat
            ) : undefined;
        }
    }

    resetForm(){
        this.myForm.reset();
    }


}
