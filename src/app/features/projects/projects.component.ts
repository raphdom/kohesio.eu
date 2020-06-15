import {AfterViewInit, Component, Inject, Renderer2, ViewChild} from '@angular/core';
import { UxService } from '@eui/core';
import {ProjectService} from "../../services/project.service";
import { FormGroup, FormBuilder } from '@angular/forms';
import {Project} from "../../shared/models/project.model";
import {Filters} from "../../shared/models/filters.model";
import {MarkerService} from "../../services/marker.service";
import { MatPaginator } from '@angular/material/paginator';
import { Router, ActivatedRoute } from '@angular/router';
import {DOCUMENT} from "@angular/common";
import {MapComponent} from "../../shared/components/map/map.component";
import {FilterService} from "../../services/filter.service";
declare let L;

@Component({
    templateUrl: './projects.component.html'
})
export class ProjectsComponent implements AfterViewInit {

    public countries: any[] = [];
    public regions: any[] = [];
    public themes: any[] = [];
    public projects: Project[] = [];
    public myForm: FormGroup;
    public isLoading = false;
    public isNotResultsTab = false;
    public loadedDataPoints = false;
    @ViewChild(MatPaginator) paginator: MatPaginator;
    @ViewChild(MapComponent) map: MapComponent;
    public selectedTabIndex:number = 1;

    constructor(private projectService: ProjectService,
                private filterService: FilterService,
                private formBuilder: FormBuilder,
                private uxService:UxService,
                private markerService:MarkerService,
                private _route: ActivatedRoute,
                private _router: Router,
                private _renderer2: Renderer2,
                @Inject(DOCUMENT) private _document: Document){}

    ngOnInit(){
        this.myForm = this.formBuilder.group({
            country: [this._route.snapshot.queryParamMap.get('country')],
            region: [this._route.snapshot.queryParamMap.get('regions')],
            theme: [this._route.snapshot.queryParamMap.get('topics')],
            keywords: this._route.snapshot.queryParamMap.get('keywords')
        });
        this.filterService.getFilters().then(result=>{

            //Countries
            for (let country of result.countries){
                let countryCode = country[0].split(",")[1].toLowerCase();
                let countryId= country[0].split(",")[0];
                this.countries.push({
                    id: countryId,
                    value: country[1],
                    iconClass: 'flag-icon flag-icon-' + countryCode
                })
            }
            if (this._route.snapshot.queryParamMap.get('country')){
                this.myForm.patchValue({
                    country: this.filterService.getFilterKey("countries",this._route.snapshot.queryParamMap.get('country'))
                });
                this.getRegions();
            }
            //Themes
            for (let topic of result.themes){
                let topicCode = topic[0].split(",")[1];
                let topicId= topic[0].split(",")[0];
                this.themes.push({
                    id: topicId,
                    value: topic[1],
                    iconClass: 'topic-icon ' + topicCode
                })
            }
            if (this._route.snapshot.queryParamMap.get('theme')){
                this.myForm.patchValue({
                    theme: this.filterService.getFilterKey("themes", this._route.snapshot.queryParamMap.get('theme'))
                });
            }
            if (this._route.snapshot.queryParamMap.get('region')){
                this.getRegions().then(regions=>{
                    this.myForm.patchValue({
                        region: this.filterService.getFilterKey("regions", this._route.snapshot.queryParamMap.get('region'))
                    });
                    this.getProjectList();
                });
            }else{
                this.getProjectList();
            }

        });
        this.markerService.getServerPoints().then(result=>{
            this.loadedDataPoints = result;
        });
    }

    ngAfterViewInit(): void {

    }

    private getProjectList(){
        const filters = new Filters().deserialize(this.myForm.value);
        this.isLoading = true;
        this.projectService.getProjects(filters).subscribe((result:Project[]) => {
            this.projects = result;
            this.isLoading = false;
            this.paginator.firstPage();
            if (this.selectedTabIndex == 3){
                this.createMarkers();
            }
        });
    }

    onSubmit() {
        this.projects = [];
        const filters = new Filters().deserialize(this.myForm.value);
        this.getProjectList();

        this._router.navigate([], {
            relativeTo: this._route,
            queryParams: this.getFormValues(),
            queryParamsHandling: 'merge'
        });
    }

    onPaginate(event){
    }

    getPageIndexStart(){
        return this.paginator ? this.paginator.pageSize * this.paginator.pageIndex : 0;
    }

    getPageIndexEnd(){
        return this.paginator ? this.getPageIndexStart() + this.paginator.pageSize : 15;
    }

    getFormValues(){
        return {
            keywords: this.myForm.value.keywords ? this.myForm.value.keywords : null,
            country: this.filterService.getFilterLabel("countries", this.myForm.value.country),
            region: this.filterService.getFilterLabel("regions", this.myForm.value.region),
            theme: this.filterService.getFilterLabel("themes", this.myForm.value.theme)
        }
    }

    onCountryChange(){
        this.getRegions();
        this.myForm.patchValue({
            region: null
        });
    }

    getRegions(): Promise<any>{
        return new Promise((resolve, reject) => {
            this.filterService.getRegions(this.myForm.value.country).subscribe(regions => {
                this.regions = [];
                for (let region of regions) {
                    let regionId = region[0];
                    this.regions.push({
                        id: regionId,
                        value: region[1]
                    })
                }
                resolve(true);
            });
        });
    }

    onTabSelected(event){
        if(event.label == "Map"){
            this.map.refreshView();
            this.createMarkers();
            this.selectedTabIndex = event.index;
        }
        this.isNotResultsTab = event.label != "Results";
    }

    createMarkers(){
        this.map.removeAllMarkers();
        for(let project of this.projects){
            if (project.coordinates && project.coordinates.length > 1) {
                const popupContent = "<a href='/projects/" + project.item +"'>"+project.title+"</a>";
                this.map.addMarkerPopup(project.coordinates[1], project.coordinates[0], popupContent);
            }
        }
    }


}