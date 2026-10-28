package com.clrms.config;

import com.clrms.entity.NgoOrganization;
import com.clrms.entity.OfficerProfile;
import com.clrms.entity.User;
import com.clrms.entity.UserRole;
import com.clrms.entity.UserStatus;
import com.clrms.repository.NgoOrganizationRepository;
import com.clrms.repository.OfficerProfileRepository;
import com.clrms.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.List;

@Configuration
public class DemoAccountConfiguration {
    private static final Logger log = LoggerFactory.getLogger(DemoAccountConfiguration.class);

    @Bean
    CommandLineRunner seedDemoAccounts(
            UserRepository users,
            OfficerProfileRepository officerProfiles,
            NgoOrganizationRepository ngoOrganizations,
            PasswordEncoder passwordEncoder,
            @Value("${app.seed-demo-data:false}") boolean seedDemoData,
            @Value("${app.seed-password:Demo@12345}") String demoPassword
    ) {
        return args -> {
            if (!seedDemoData) {
                log.info("Seed demo data is disabled (app.seed-demo-data=false). Skipping.");
                return;
            }

            if (users.count() > 0) {
                if (seedDemoData) {
                    // Only fill unset capacity for explicitly seeded demo organizations.
                    users.findAll().stream()
                            .filter(User::isDemoAccount)
                            .filter(user -> user.getRole() == UserRole.NGO_OFFICIAL
                                    || user.getRole() == UserRole.NGO_STAFF)
                            .map(User::getNgoOrganizationId)
                            .filter(java.util.Objects::nonNull)
                            .distinct()
                            .forEach(ngoId -> ngoOrganizations.findById(ngoId).ifPresent(ngo -> {
                                if (java.util.Objects.equals(ngo.getCapacity(), 0)
                                        && java.util.Objects.equals(ngo.getAvailableBeds(), 0)) {
                                    ngo.setCapacity(5);
                                    ngo.setAvailableBeds(5);
                                    ngoOrganizations.save(ngo);
                                }
                            }));
                }
                log.info("Users table already contains {} records. Seeding skipped per specification.", users.count());
                return;
            }

            log.info("Seeding demo accounts into empty database...");
            String passwordHash = passwordEncoder.encode(demoPassword);

            // 1. ADMIN
            User admin = new User();
            admin.setName("System Administrator");
            admin.setEmail("admin@clrms.local");
            admin.setPasswordHash(passwordHash);
            admin.setRole(UserRole.ADMIN);
            admin.setStatus(UserStatus.ACTIVE);
            admin.setDesignation("Chief Administrator");
            admin.setDemoAccount(true);
            users.save(admin);

            // 2. 5 OFFICERS
            record OfficerSeed(String name, String email, String state, String badge) {}
            List<OfficerSeed> officers = List.of(
                    new OfficerSeed("Arun Kumar", "arun.kumar@clrms.local", "Tamil Nadu", "TN-CP-101"),
                    new OfficerSeed("Priya Sharma", "priya.sharma@clrms.local", "Kerala", "KL-CP-102"),
                    new OfficerSeed("Rahul Verma", "rahul.verma@clrms.local", "Karnataka", "KA-CP-103"),
                    new OfficerSeed("Ananya Das", "ananya.das@clrms.local", "Andhra Pradesh", "AP-CP-104"),
                    new OfficerSeed("Amit Patel", "amit.patel@clrms.local", "Maharashtra", "MH-CP-105")
            );

            for (OfficerSeed seed : officers) {
                User officerUser = new User();
                officerUser.setName(seed.name());
                officerUser.setEmail(seed.email());
                officerUser.setPasswordHash(passwordHash);
                officerUser.setRole(UserRole.OFFICER);
                officerUser.setStatus(UserStatus.ACTIVE);
                officerUser.setState(seed.state());
                officerUser.setOrganization("Child Protection Unit");
                officerUser.setDesignation("Child Protection Officer");
                officerUser.setDemoAccount(true);
                User savedOfficer = users.save(officerUser);

                OfficerProfile profile = new OfficerProfile();
                profile.setUserId(savedOfficer.getId());
                profile.setAssignedState(seed.state());
                profile.setBadgeNumber(seed.badge());
                profile.setDepartment("Child Labour Rehabilitation Unit");
                officerProfiles.save(profile);
            }

            // 3. 5 NGO ORGANIZATIONS AND OFFICIALS
            record NgoSeed(String officialName, String email, String ngoName, String state, String district) {}
            List<NgoSeed> ngos = List.of(
                    new NgoSeed("Meena Lakshmi", "meena.lakshmi@clrms.local", "Uyir Trust", "Tamil Nadu", "Chennai"),
                    new NgoSeed("Ravi Menon", "ravi.menon@clrms.local", "Child Care Foundation", "Kerala", "Ernakulam"),
                    new NgoSeed("Kavitha Reddy", "kavitha.reddy@clrms.local", "Hope for Children NGO", "Karnataka", "Bengaluru Urban"),
                    new NgoSeed("Sanjay Kumar", "sanjay.kumar@clrms.local", "Bal Suraksha Foundation", "Maharashtra", "Mumbai"),
                    new NgoSeed("Divya Nair", "divya.nair@clrms.local", "New Life Rehabilitation Trust", "Andhra Pradesh", "Visakhapatnam")
            );

            for (NgoSeed seed : ngos) {
                NgoOrganization ngo = new NgoOrganization();
                ngo.setName(seed.ngoName());
                ngo.setEmail(seed.email());
                ngo.setState(seed.state());
                ngo.setDistrict(seed.district());
                ngo.setAddress("Registered Office, " + seed.district() + ", " + seed.state());
                // Synthetic capacity keeps the seeded demo referral workflow usable.
                ngo.setCapacity(5);
                ngo.setAvailableBeds(5);
                NgoOrganization savedNgo = ngoOrganizations.save(ngo);

                User ngoUser = new User();
                ngoUser.setName(seed.officialName());
                ngoUser.setEmail(seed.email());
                ngoUser.setPasswordHash(passwordHash);
                ngoUser.setRole(UserRole.NGO_OFFICIAL);
                ngoUser.setStatus(UserStatus.ACTIVE);
                ngoUser.setState(seed.state());
                ngoUser.setDistrict(seed.district());
                ngoUser.setOrganization(seed.ngoName());
                ngoUser.setNgoOrganizationId(savedNgo.getId());
                ngoUser.setDesignation("Rehabilitation Coordinator");
                ngoUser.setDemoAccount(true);
                users.save(ngoUser);
            }

            // 4. 1 CITIZEN
            User citizen = new User();
            citizen.setName("Demo Citizen");
            citizen.setEmail("citizen@clrms.local");
            citizen.setPasswordHash(passwordHash);
            citizen.setRole(UserRole.CITIZEN);
            citizen.setStatus(UserStatus.ACTIVE);
            citizen.setDemoAccount(true);
            users.save(citizen);

            log.info("Demo accounts seeded successfully: 1 ADMIN, 5 OFFICERS (linked to officer_profiles), 5 NGO OFFICIALS (linked to ngo_organizations), 1 CITIZEN.");
        };
    }
}
